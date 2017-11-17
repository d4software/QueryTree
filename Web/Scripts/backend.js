// 'backend' Module
//
// Depends on: utils.js

backend = {};

(function () {

    backend.CheckConnection = function (models, callback) {
        var databaseId = utils.GetHiddenValByName('DatabaseConnectionID');
        $.getJSON("/api/connection/?databaseId=" + databaseId, function (data) {
            callback(data);
        });
    };

    backend.LoadTables = function (callback) {
        var databaseId = utils.GetHiddenValByName('DatabaseConnectionID');
        $.getJSON("/api/tables/?databaseId=" + databaseId, function (data) {
            callback(data);
        })
        .fail(function () {
            callback([]);
        });
    };

    backend.GetJoins = function (tableName, callback) {
        var databaseId = utils.GetHiddenValByName('DatabaseConnectionID');
        $.getJSON("/api/joins/?databaseId=" + databaseId + "&tableName=" + tableName, function (data) {
            callback(data);
        })
        .fail(function () {
            callback([]);
        });
    };

    var lock = false,
        callbacks = [],
        latestNodes = null;

    backend.saveQuery = function (serverQueryKey, nodes, callback) {
        if (callback) {
            callbacks.push(callback);
        }

        if (lock) {
            latestNodes = nodes;
        } else {
            lock = true;
            latestNodes = null;
            $.ajax({
                "url": '/api/Nodes',
                "type": 'POST',
                "data": {
                    id: serverQueryKey(),
                    databaseId: utils.GetHiddenValByName('DatabaseConnectionID'),
                    nodes: JSON.stringify(nodes)
                },
                "dataType": "json"
            }).done(function (data) {
                serverQueryKey(data.id);
                lock = false;

                // if we have callbacks then obviously something changed while we were getting results, add this callback to queue and resave to get latest data
                if (latestNodes) {
                    var tmp = latestNodes;
                    latestNodes = null;
                    backend.saveQuery(serverQueryKey, tmp);
                } else {
                    while (callbacks.length > 0) {
                        callbacks.shift()();
                    }
                }
            }).fail(function () {
                lock = false;
                latestNodes = null;
                callbacks.length = 0;
            });
        }
    }

    backend.LoadData = function (serverQueryKey, nodes, nodeId, startRow, rowCount, format, output, callback) {
        if (!serverQueryKey()) {
            backend.saveQuery(serverQueryKey, nodes, function () {
                backend.LoadData(serverQueryKey, nodes, nodeId, startRow, rowCount, format, output, callback);
            });
        } else {
            $.getJSON("/api/data/?id=" + serverQueryKey() + "&nodeId=" + nodeId + "&startRow=" + startRow + "&rowCount=" + rowCount, function (data) {
                if (data.query) {
                    console.log(data.query);
                }
                callback(data);
            })
            .fail(function (jqXHR, textStatus, errorThrown) {
                if (jqXHR.status == "404") {
                    serverQueryKey(null);
                    backend.LoadData(serverQueryKey, nodes, nodeId, startRow, rowCount, format, output, callback);
                } else {
                    callback({ status: "error" })
                }
            });
        }
    };

    backend.SaveSchedule = function (schedule, callback) {
        $.ajax({
            "url": '/api/schedule',
            "type": 'POST',
            "contentType": "application/json",
            "data": JSON.stringify(schedule),
            "dataType": "json"
        }).done(function (data) {
            callback(data);
        }).fail(function (data) {
            callback(data);
        });
    }

    backend.GetSchedule = function (queryId) {
        return $.ajax({
            "url": '/api/schedule?id=' + queryId,
            "type": 'GET',
            "contentType": "application/json",
            "dataType": "json"
        });
    }

    backend.LoadQueryColumnsName = function (queryId) {
        return $.ajax({
            "url": "/api/QueryColumnsName?queryId=" + queryId,
            "type": 'GET'
        });
    };
})();