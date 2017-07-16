
"use strict";
/*jslint browser: true, nomen: true*/
/*global define*/

define([], function () {
    return function (frame) {
        var player = frame.player(),
            layout = frame.layout(),
            model = function() { return frame.model(); },
            client = function(id) { return frame.model().clients.find(id); },
            node = function(id) { return frame.model().nodes.find(id); },
            cluster = function(value) { model().nodes.toArray().forEach(function(node) { node.cluster(value); }); },
            wait = function() { var self = this; model().controls.show(function() { self.stop(); }); },
            subtitle = function(s, pause) { model().subtitle = s + model().controls.html(); layout.invalidate(); if (pause === undefined) { model().controls.show() }; };

        //------------------------------
        // Title
        //------------------------------
        frame.after(1, function() {
            model().clear();
            layout.invalidate();
        })
        .after(500, function () {
            frame.model().title = '<h2 style="visibility:visible">Leader选举</h1>'
                                + '<br/>' + frame.model().controls.html();
            layout.invalidate();
        })
        .after(200, wait).indefinite()
        .after(500, function () {
            model().title = "";
            layout.invalidate();
        })

        //------------------------------
        // Initialization
        //------------------------------
        .after(300, function () {
            model().nodes.create("A").init();
            model().nodes.create("B").init();
            model().nodes.create("C").init();
            cluster(["A", "B", "C"]);
        })

        //------------------------------
        // Election Timeout
        //------------------------------
        .after(1, function () {
            model().ensureSingleCandidate();
            model().subtitle = '<h2>在Raft中有两个超时机制影响选举。</h2>'
                           + model().controls.html();
            layout.invalidate();
        })
        .after(model().electionTimeout / 2, function() { model().controls.show(); })
        .after(100, function () {
            subtitle('<h2>首先是<span style="color:green">候选超时</span>.</h2>');
        })
        .after(1, function() {
            subtitle('<h2>候选超时是指一个follower等待成为candidate（候选人）的时间。</h2>');
        })
        .after(1, function() {
            subtitle('<h2>候选超时时间是一个随机分配在150ms到300ms之间的值。</h2>');
        })
        .after(1, function() {
            subtitle("", false);
        })

        //------------------------------
        // Candidacy
        //------------------------------
        .at(model(), "stateChange", function(event) {
            return (event.target.state() === "candidate");
        })
        .after(1, function () {
            subtitle('<h2>当到达选举超时时间后，follower将变为candidate（候选人）状态并发起新一届的<em>选举</em>...</h2>');
        })
        .after(1, function () {
            subtitle('<h2>...候选人在本届选举中为自己投票...</h2>');
        })
        .after(model().defaultNetworkLatency * 0.25, function () {
            subtitle('<h2>...并发送<em>表决请求</em>信息到其他节点上（拉票）。</h2>');
        })
        .after(model().defaultNetworkLatency, function () {
            subtitle('<h2>如果接收信息的节点没有在本届选举中作出过任何表决，则将投票给这个candidate...</h2>');
        })
        .after(1, function () {
            subtitle('<h2>...并将自己的候选超时时间。</h2>');
        })


        //------------------------------
        // Leadership & heartbeat timeout.
        //------------------------------
        .at(model(), "stateChange", function(event) {
            return (event.target.state() === "leader");
        })
        .after(1, function () {
            subtitle('<h2>一旦候选人获得大多数选票（大于半数节点的票数），他就成了leader。</h2>');
        })
        .after(model().defaultNetworkLatency * 0.25, function () {
            subtitle('<h2>这个新leader开始发送<em>Append Entries</em>信息给它的所有follower。</h2>');
        })
        .after(1, function () {
            subtitle('<h2>这些信息是按<span style="color:red">heartbeat timeout（心跳超时）</span>的间隔发送的。</h2>');
        })
        .after(model().defaultNetworkLatency, function () {
            subtitle('<h2>然后，Follower会对每个<em>Append Entries</em>消息作出响应。</h2>');
        })
        .after(1, function () {
            subtitle('', false);
        })
        .after(model().heartbeatTimeout * 2, function () {
            subtitle('<h2>这个leader的任期将一直持续到follower停止心跳并成为candidate为止。</h2>', false);
        })
        .after(100, wait).indefinite()
        .after(1, function () {
            subtitle('', false);
        })

        //------------------------------
        // Leader re-election
        //------------------------------
        .after(model().heartbeatTimeout * 2, function () {
            subtitle('<h2>让我们停掉leader看看重新选举的过程。</h2>', false);
        })
        .after(100, wait).indefinite()
        .after(1, function () {
            subtitle('', false);
            model().leader().state("stopped")
        })
        .after(model().defaultNetworkLatency, function () {
            model().ensureSingleCandidate()
        })
        .at(model(), "stateChange", function(event) {
            return (event.target.state() === "leader");
        })
        .after(1, function () {
            subtitle('<h2>Node ' + model().leader().id + ' 现在是第' + model().leader().currentTerm() + '次选举出来的leader了。</h2>', false);
        })
        .after(1, wait).indefinite()

        //------------------------------
        // Split Vote
        //------------------------------
        .after(1, function () {
            subtitle('<h2>每次选举都必须得到过半数票数才能确立leader，以确保每次选举都只产生一个leader。</h2>', false);
        })
        .after(1, wait).indefinite()
        .after(1, function () {
            subtitle('<h2>如果两个节点同时成为candidate，则可能发生分裂投票。</h2>', false);
        })
        .after(1, wait).indefinite()
        .after(1, function () {
            subtitle('<h2>让我们看一个分裂投票的例子...</h2>', false);
        })
        .after(1, wait).indefinite()
        .after(1, function () {
            subtitle('', false);
            model().nodes.create("D").init().currentTerm(node("A").currentTerm());
            cluster(["A", "B", "C", "D"]);

            // Make sure two nodes become candidates at the same time.
            model().resetToNextTerm();
            var nodes = model().ensureSplitVote();

            // Increase latency to some nodes to ensure obvious split.
            model().latency(nodes[0].id, nodes[2].id, model().defaultNetworkLatency * 1.25);
            model().latency(nodes[1].id, nodes[3].id, model().defaultNetworkLatency * 1.25);
        })
        .at(model(), "stateChange", function(event) {
            return (event.target.state() === "candidate");
        })
        .after(model().defaultNetworkLatency * 0.25, function () {
            subtitle('<h2>两个节点同时启动了相同的选举...</h2>');
        })
        .after(model().defaultNetworkLatency * 0.75, function () {
            subtitle('<h2>...每个节点在另一个节点之前到达一个follower节点。</h2>');
        })
        .after(model().defaultNetworkLatency, function () {
            subtitle('<h2>现在两个candidate各得到了2票并且都不可能再得到更多选票了。</h2>');
        })
        .after(1, function () {
            subtitle('<h2>所有节点将等待下一次新选举流程重新进行选举。</h2>', false);
        })
        .at(model(), "stateChange", function(event) {
            return (event.target.state() === "leader");
        })
        .after(1, function () {
            model().resetLatencies();
            subtitle('<h2>Node ' + model().leader().id + ' 在这次选举中得到了大多数节点的选票，所以它成为了第' + model().leader().currentTerm() + '次选举出来的leader</h2>', false);
        })
        .after(1, wait).indefinite()

        .then(function() {
            player.next();
        })


        player.play();
    };
});
