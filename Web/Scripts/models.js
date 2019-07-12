// 'models' Module
//
// Defines the View Models for this application
//
// Depends on: knockout.js, nodes.js, tools.js, utils.js
models = {

    ResultsOnly: ko.observable(false),
    ResultsOnlyLoaded: ko.observable(false),
    ServerQueryKey: ko.observable(),

    ui_state: {
        workspace_canvas: null,
        dragging_handle: null,
        connecting_handle: null,
        connector: {
            IsVisible: ko.observable(false),
            StartX: ko.observable(),
            StartY: ko.observable(),
            EndX: ko.observable(),
            EndY: ko.observable()
        }
    },

    SelectedNode: ko.observable(),
    SelectedConnector: ko.observable(),

    SuggestedConnection: {
        IsVisible: ko.observable(false),
        FromNodeId: ko.observable(null),
        ToNodeId: ko.observable(null),
        ToDroppingPoint: {
            X: ko.observable(0),
            Y: ko.observable(0)
        }
    },

    Tools: [
        new tools.DatabaseTable(),
        new tools.Sort(),
        new tools.Filter(),
        new tools.Join(),
        new tools.Summarize(),
        new tools.Select(),
        new tools.Append(),
        new tools.Extract(),
        new tools.LineChart(),
        new tools.BarChart(),
        new tools.PieChart()
    ]
};

models.SelectedNodeHasRender = ko.computed(function() {
    if (models.SelectedNode() != null) {
        return models.SelectedNode().RenderResults ? true : false;
    }
    else {
        return false;
    }
});


models.SelectedNodeHasRenderAndNotError = ko.computed(function() {
    if (models.SelectedNode() != null) {
        return models.SelectedNodeHasRender() && !models.SelectedNodeHasError() ? true : false;
    }
    else {
        return false;
    }
});

var formatNumber = function(num) {
    nStr = num + '';
    x = nStr.split('.');
    x1 = x[0];
    x2 = x.length > 1 ? '.' + x[1] : '';
    var rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1)) {
        x1 = x1.replace(rgx, '$1' + ',' + '$2');
    }
    return x1 + x2;
};

models.CurrentData = ko.observableArray();        
models.CurrentRowStart = ko.observable(0);
models.CurrentRowStartFormatted = ko.computed(function() {
    return formatNumber(models.CurrentRowStart());
});
models.CurrentRowEnd = ko.observable(null);
models.CurrentRowEndFormatted = ko.computed(function() {
    return formatNumber(models.CurrentRowEnd());
});
models.CurrentRowsTotal = ko.observable();
models.CurrentRowsTotalFormatted = ko.computed(function() {
    return formatNumber(models.CurrentRowsTotal());
});
models.DataPageSize = ko.observable(10);
models.CurrentDataColumns = ko.observableArray();

models.IsPreviousVisible = ko.computed(function() {
    if (models.CurrentRowStart() != null) {
        return models.CurrentRowStart() > 1;
    }
    else {
        return false;
    }
});

models.IsNextVisible = ko.computed(function() {
    if (models.CurrentRowEnd () != null) {
        return models.CurrentRowEnd() < models.CurrentRowsTotal();
    }
    else {
        return false;
    }
});

models.IsDataVisible = ko.computed(function() {
    if (models.SelectedNode() != null && models.CurrentData() != null && models.CurrentData().length > 0 && models.SelectedNodeStatus() == "ok" && models.RenderResults == undefined) {
        return true;
    }
    else {
        return false;
    }
});

models.SelectedNodeStatus = ko.observable(null);

models.SelectedNodeHasError = ko.computed(function() {
    return (models.SelectedNodeStatus() != null && models.SelectedNodeStatus() != "ok");
});

models.SelectedNodeErrorText = ko.computed(function () {
    if (models.SelectedNode() != null) {
        return models.SelectedNode().ErrorText();
    }
    else {
        return null;
    }
});

models.ObjectSelected = ko.computed(function() {
    return models.SelectedNode() != null;
});

models.ShowOptions = ko.computed(function() {
    return models.SelectedNode() != null;
});

models.ShowExportImage = ko.computed(function() {
    return models.SelectedNode() != null && models.SelectedNode().Tool.AllowImageExport;
});

models.ShowExport = ko.computed(function() {
    return models.IsDataVisible() || models.ShowExportImage();
});

var buildNodesArgs = function (models) {
    var nodes = []
    $.each(models.current_nodes(), function (i, node) {
        // Only get the 'core' settings, not the full 'save' settings because 
        // qt.exe doesn't need to know about all the visual aspects of the tree
        nodes.push(node.GetCoreSettings());
    });

    return nodes = JSON.stringify(nodes);
}

models.ExportFileName = ko.observable();

models.ExportUrl = ko.observable();
        
models.Export = function () {
    var node = models.SelectedNode();
    if (node != null) {
        if (models.ShowExportImage()) {
            var parent = $("div[data-results-node-id='" + node.Id + "']")
            var svg = document.getElementById(parent.attr("Id")).children[0];

            var serializer = new XMLSerializer();

            var img = new Image();
            img.src = 'data:image/svg+xml;base64,' + window.btoa(serializer.serializeToString(svg));

            var canvas = document.createElement("canvas");// get it's context
            canvas.width = $(svg).width()
            canvas.height = $(svg).height()

            ctx = canvas.getContext('2d');
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            var dataUrl = canvas.toDataURL("image/png");
            dataUrl = dataUrl.replace(":image/png;", ":application/octet-stream;");
            models.ExportUrl(dataUrl);
            models.ExportFileName("image.png");
            return true;
        } else {
            if (models.ServerQueryKey()) {
                models.ExportUrl(backend.baseUri + "/api/cache/" + models.ServerQueryKey() + "/" + node.Id + "/export/");
                models.ExportFileName("export.xlsx");
            } else {
                models.ExportUrl(null);
                models.ExportFileName(null);
            }
            return true;
        }
    } else {
        models.ExportFileName("");
        models.ExportUrl("");
    }
};

models.current_nodes = ko.observableArray();

models.findTool = function(name) {
    var result = null;
    $.each(models.Tools, function(i, val) {
        if (val.Name === name) {
            result = val;
        }
    });
    return result;
};


models.GetNodeAt = function (x, y) {
    var result = null;
    $.each(models.current_nodes(), function (i, val) {
        if (val.Top() <= y && (val.Top() + 48) >= y && val.Left() <= x && (val.Left() + 48) >= x) {
            result = val;
        }
    });
    return result;
}

models.GetNodeDragHandle = function(x, y) {
    var val = models.GetNodeAt(x, y), result = null;
    if (val != null) {
        result = { node: val, x: x - val.Left(), y: y - val.Top() };
    }
    return result;
}

models.GetNodeConnectionHandle = function(x, y, fromType) {
    var result = null;
    $.each(models.current_nodes(), function(i, node) {
        if (node.Inputs && fromType === 'output' && node.Top() <= y && (node.Top() + 48) >= y && (node.Left() - 16) <= x && (node.Left() + 48) >= x) {
            result = { node: node, type: 'input', mouseX: x, mouseY: y };
        }
        if ((node.Type === 'DataSource' || node.Type === 'DataProcessor') && (fromType === 'input' || fromType == undefined) && (node.Top() + 20) <= y && (node.Top() + 28) >= y && (node.Left() + 56) <= x && (node.Left() + 64) >= x) {
            result = { node: node, type: 'output', mouseX: x, mouseY: y };
        }
    });
    return result;
}

models.GetControlPoint = function(point1, point2) {
    return {
        x: Math.min(point1.x, point2.x) + (Math.abs(point1.x - point2.x) / 2),
        y: Math.min(point1.y, point2.y)
    }
}

models.GetConnectorAt = function(x, y) {
    var result = null;

    $.each(models.current_nodes(), function (i, node) {
        if (node.Inputs) {
            $.each(node.Inputs(), function (j, input) {
                for (var t = 0; t <= 1; t += 0.05) {

                    var receiverPoint = node.GetReceiverPoint();
                    var transmitterPoint = models.GetNodeById(input).GetTransmitterPoint();
                    var controlPoint = models.GetControlPoint(transmitterPoint, receiverPoint);

                    // Based on http://antoineleclair.ca/2011/08/27/understanding-quadratic-bezier-curves/
                    var p1x = transmitterPoint.x;
                    var p1y = transmitterPoint.y;
                    var cx = controlPoint.x;
                    var cy = controlPoint.y;
                    var p2x = receiverPoint.x;
                    var p2y = receiverPoint.y;

                    // Calculate the point on the curve for this value of t
                    var c1x = p1x + (cx - p1x) * t;
                    var c1y = p1y + (cy - p1y) * t;
                    var c2x = cx + (p2x - cx) * t;
                    var c2y = cy + (p2y - cy) * t;
                    var tx = c1x + (c2x - c1x) * t;
                    var ty = c1y + (c2y - c1y) * t;

                    var curvePoint = { x: tx, y: ty };

                    // Debug code
                    //var circle = new fabric.Circle({
                    //    top: curvePoint.y,
                    //    left: curvePoint.x,
                    //    strokeWidth: 1,
                    //    radius: 12,
                    //    fill: '#f00',
                    //    stroke: 'none',
                    //});
                    //models.ui_state.workspace_canvas.add(circle);
                    //models.ui_state.workspace_canvas.renderAll();
                    // End of Debug code

                    if ((curvePoint.x - 12) < x && x < (curvePoint.x + 12) && (curvePoint.y - 12) < y && y < (curvePoint.y + 12)) {
                        result = { fromNodeId: input, toNodeId: node.Id }
                        return false;
                    }
                }
            });
        }
    });
    return result;
}

models.RemoveConnector = function(fromNodeId, toNodeId) { 
    var destNode = models.GetNodeById(toNodeId);
    var removedInputs = destNode.Inputs.remove(function(input) {
        return input === fromNodeId;
    });

    $.each(removedInputs, function(j, removedInput) {
        // If this node has inputs, remove the connectors
        if (destNode.inputPaths) {
            models.ui_state.workspace_canvas.remove(destNode.inputPaths[removedInput]);
            models.ui_state.workspace_canvas.remove(destNode.inputCircles[removedInput]);

            var newInputPaths = {};
            for (var path in destNode.inputPaths) {
                if (path !== removedInput) {
                    newInputPaths[path] = destNode.inputPaths[path];
                }
            }
            destNode.inputPaths = newInputPaths;

            var newInputCircles = {};
            for (var circle in destNode.inputCircles) {
                if (circle !== removedInput) {
                    newInputCircles[circle] = destNode.inputCircles[circle];
                }
            }
            destNode.inputCircles = newInputCircles;
        }
    });

    if (removedInputs.length > 0) {
        destNode.OnInputsUpdated(models);
    }
}

models.GetNodeById = function(id) {
    var result = null;
    $.each(models.current_nodes(), function(i, val) {
        if (val.Id === id) {
            result = val;
        }
    });
    return result;
}

models.RemoveNode = function(id) {

    // Remove this node's ID from the list of inputs on other nodes
    $.each(models.current_nodes(), function(i, otherNode) {
        if (otherNode.Inputs) {
            var removedInputs = otherNode.Inputs.remove(function(input) {
                return input === id
            });

            $.each(removedInputs, function(j, removedInput) {
                // If this node has inputs, remove the connectors
                if (otherNode.inputPaths) {
                    models.ui_state.workspace_canvas.remove(otherNode.inputPaths[removedInput]);
                    models.ui_state.workspace_canvas.remove(otherNode.inputCircles[removedInput]);

                    delete otherNode.inputPaths[removedInput];
                    delete otherNode.inputCircles[removedInput];
                }
            });

            if (removedInputs.length > 0) {
                otherNode.OnInputsUpdated(models);
            }
        }
    });

    // Node remove this node
    var nodes = models.current_nodes.remove(function(node) {
        return node.Id === id;
    });

    if (nodes) {
        $.each(nodes, function(i, node) {

            // If the canvas has a group, remove it
            if (node.iconGroup) {
                models.ui_state.workspace_canvas.remove(node.iconGroup);
            }

            // If this node has inputs, remove the connectors
            if (node.inputPaths) {
                $.each(node.inputPaths, function(i, path) {
                    models.ui_state.workspace_canvas.remove(path);
                });

                $.each(node.inputCircles, function(i, circle) {
                    models.ui_state.workspace_canvas.remove(circle);
                });
            }

            if (node === models.SelectedNode()) {
                models.SelectedNode(null);
            }
        });
    }
}

models.IsCircularDependency = function(fromNode, toNode) {

    var checkInputsForId = function(inputs, id) {
        var result = false;
        $.each(inputs, function(i, val) {
            if (val === id) {
                result = true;
                return false;
            }
            else {
                var inputNode = models.GetNodeById(val);
                if (inputNode && inputNode.Inputs) {
                    if (checkInputsForId(inputNode.Inputs(), id)) {
                        result = true;
                        return false;
                    }
                }
            }
        });
        return result;
    }

    if (fromNode.Inputs) {
        return checkInputsForId(fromNode.Inputs(), toNode.Id);
    }
    else {
        return false;
    }
};

models.GetNodeInSuggestionRange = function(x, y, leftToRight, currentId) {
    var closestNode = null;
    if (leftToRight == undefined) {
        leftToRight = true;
    }
    $.each(models.current_nodes(), function (i, node) {
        if (currentId && node.Id == currentId) {
            return;
        }

        var otherNodePoint = null;
        if (leftToRight) {
            if (node.GetTransmitterPoint) {
                otherNodePoint = node.GetTransmitterPoint();
            }
        }
        else {
            if (node.GetReceiverPoint) {
                otherNodePoint = node.GetReceiverPoint();
            }
        }

        if (otherNodePoint != null) {
            var distance = Math.sqrt(Math.pow(x - otherNodePoint.x, 2) + Math.pow(y - otherNodePoint.y, 2))
            if (distance < 80) {
                if (closestNode == null || closestNode.distance > distance) {
                    closestNode = {
                        distance: distance,
                        node: node
                    }
                }
            }
        }
    });

    if (closestNode) {
        return closestNode.node;
    }
    else {
        return null;
    }
};

models.SuggestedConnection.FromPoint = ko.computed(function() {
    var fromNode = models.GetNodeById(models.SuggestedConnection.FromNodeId());
    if (fromNode != null) {
        var fromPoint = fromNode.GetTransmitterPoint();

        return {
            X: fromPoint.x,
            Y: fromPoint.y
        };
    }
    else {
        return {
            X: 0,
            Y: 0
        }
    }
});

models.SuggestedConnection.ToPoint = ko.computed(function() {
    var toNode = models.GetNodeById(models.SuggestedConnection.ToNodeId());
    if (toNode != null) {
        var toPoint = toNode.GetReceiverPoint();

        return {
            X: toPoint.x,
            Y: toPoint.y
        }
    }
    else {
        if (models.SuggestedConnection.ToDroppingPoint.X() !== 0 && models.SuggestedConnection.ToDroppingPoint.Y() !== 0) {
            return {
                X: models.SuggestedConnection.ToDroppingPoint.X(),
                Y: models.SuggestedConnection.ToDroppingPoint.Y()
            }
        }
        else {
            return {
                X: 0,
                Y: 0
            }
        }
    }
});

models.RemoveEverything = function() {
    // Clean everything up
    models.current_nodes.removeAll();
    if (models.ui_state.workspace_canvas != null) {
        models.ui_state.workspace_canvas.clear();
    }            
    models.SelectedNode(null);
    models.SelectedConnector(null);

    $.each(models.Tools, function(i, tool) {
        tool.CreatedCount = 0;
    });
}

models.MaxNodesWidth = function() {
    var result = 0;
    $.each(models.current_nodes(), function(i, node) {
        result = Math.max(result, node.GetRightExtent());
    });
    return result;
};

models.MaxNodesHeight = function() {
    var result = 0;
    $.each(models.current_nodes(), function(i, node) {
        result = Math.max(result, node.GetBottomExtent());
    });
    return result;
};

models.FormatColumn = function(index, data) {
    var column_type = null;

    if (models.SelectedNode() != null) {
        column_type = models.SelectedNode().ColumnTypes()[index];
    }

    if (data != null) {
        switch (column_type) {
            case 'datetime':
                return moment(data).format('lll');
            case 'date':
                return moment(data).format('ll');
            default:
                return data;
        }
    }

    return null;
}

models.GetCoreNodeSettings = function () {
    var nodes = []
    $.each(models.current_nodes(), function (i, node) {
        // Only get the 'core' settings, not the full 'save' settings because 
        // the backend doesn't need to know about all the visual aspects of the tree
        nodes.push(node.GetCoreSettings());
    });

    return nodes;
}