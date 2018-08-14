// 'views' Module
//
// This file contains functions that render the model onto the DOM/Canvas
//
// Depends on: knockout.js, fabric.js, Delicious_500.font, jquery.ui.timepicker.js, jquery.maskedinput.min.js, jquery.numeric.js
//             models.js, events.js, nodes.js, 

views = {};

// helper function for finding the points on a connector path between two nodes
var getConnectorParameters = function(sourceNode, destinationNode) {
    var source = sourceNode.GetTransmitterPoint();
    var destination = destinationNode.GetReceiverPoint();
    return getConnectorParametersFromCoords(source.x, source.y, destination.x, destination.y);
}

var getConnectorParametersFromCoords = function(sourceX, sourceY, destinationX, destinationY) {
    return { 
        Top: Math.min(sourceY, destinationY) + (Math.abs(destinationY - sourceY) / 2),
        Left: Math.min(sourceX, destinationX) + (Math.abs(destinationX - sourceX) / 2),
        Height: Math.abs(destinationY - sourceY),
        Width: Math.abs(destinationX - sourceX),
        StartX: Math.abs(Math.min(0, destinationX - sourceX)),
        StartY: Math.abs(Math.min(0, destinationY - sourceY)),
        CurvePointX: (Math.abs(destinationX - sourceX) / 2),
        CurvePointY: 0,
        EndX: Math.abs(Math.max(0, destinationX - sourceX)),
        EndY: Math.abs(Math.max(0, destinationY - sourceY)),
        EndPointX: destinationX,
        EndPointY: destinationY
    };
}

views.RenderToolbarSymbol = function(element, valueAccessor) {
    var symbol_path = valueAccessor().SymbolPath;
    // This should work, but somehow doesn't, we'll have to use attributes in the HTML for now
    /*var parent = $(element).parent();
    var options = { width: parent.width(), height: parent.height() };*/
    var canvas = new fabric.StaticCanvas(element/*, options*/);

    var color = "#d9d9d9";

    var path = new fabric.Path(symbol_path, { 
        top: 16,
        left: 16,
        height: 32,
        width: 32,
        strokeWidth: 0,
        fill: color
    });

    canvas.add(path);
    canvas.renderAll();
}

var _dragged = null;
views.RenderDraggableToolbarButton = function(element, valueAccessor) {
    $(element).draggable({
        helper: function() {
            var helper = $("<div></div>").text(valueAccessor().Title);
            $(element).append(helper);
            return helper;
        },
        drag: function (event, ui) {
            events.OnToolDrag(event, ui, _dragged);
        },
        start: function () {
            _dragged = valueAccessor();
            $("#dropTarget").text(_dragged.Title).show();
        },
        stop: function() {
            models.SuggestedConnection.IsVisible(false);
            $("#dropTarget").hide();
        },
    });
}

views.RenderDroppableArea = function (element, valueAccessor) {
    $(element).droppable({
        drop: function (event, ui) {
            if (_dragged != null) {
                events.OnToolDrop(event, ui, _dragged);
                _dragged = null;
            }
        }
    });
}

views.CreateWorkspace = function(element, valueAccessor) {
    var div = $("#workspace");
    $("#workspace_canvas").attr("width", div.width()).attr("height", div.height());
    div[0].onselectstart = function() { return false; }

    models.ui_state.workspace_canvas = new fabric.StaticCanvas("workspace_canvas");
}

var drawOrUpdateConnector = function(
    isVisible,
    startX,
    startY,
    endX,
    endY,
    referenceHolder,
    color,
    isFront
    ) {
    if (isVisible === true) {
        var connectorParams = getConnectorParametersFromCoords(
            startX,
            startY,
            endX,
            endY);

        if (referenceHolder.path) {
            referenceHolder.path.path[0][1] = connectorParams.StartX;
            referenceHolder.path.path[0][2] = connectorParams.StartY;
            referenceHolder.path.path[1][1] = connectorParams.CurvePointX;
            referenceHolder.path.path[1][2] = connectorParams.CurvePointY;
            referenceHolder.path.path[1][3] = connectorParams.EndX;
            referenceHolder.path.path[1][4] = connectorParams.EndY;
            referenceHolder.path.set("top", connectorParams.Top);
            referenceHolder.path.set("left", connectorParams.Left);
            referenceHolder.path.set("height", connectorParams.Height);
            referenceHolder.path.set("width", connectorParams.Width);

            referenceHolder.circle.set("top", endY);
            referenceHolder.circle.set("left", endX);
        }
        else {
            referenceHolder.path = new fabric.Path("M" + connectorParams.StartX + " " + connectorParams.StartY  + " Q" + connectorParams.CurvePointX  + "," + connectorParams.CurvePointY + " " + connectorParams.EndX  + "," + connectorParams.EndY, {
                strokeWidth: 2,
                stroke: color,
                fill: "",
                top: connectorParams.Top,
                left: connectorParams.Left,
                height: connectorParams.Height,
                width: connectorParams.Width
            });

            referenceHolder.circle = new fabric.Circle({
                top: connectorParams.EndPointY,
                left: connectorParams.EndPointX,
                strokeWidth: 1,
                radius: 4,
                fill: color,
                stroke: 'none'
            });

            referenceHolder.circle.hasBorders = false;
            models.ui_state.workspace_canvas.add(referenceHolder.circle);
            models.ui_state.workspace_canvas.add(referenceHolder.path);

            if (isFront) {
                models.ui_state.workspace_canvas.bringToFront(referenceHolder.circle);
                models.ui_state.workspace_canvas.bringToFront(referenceHolder.path);
            }
            else {
                models.ui_state.workspace_canvas.sendToBack(referenceHolder.circle);
                models.ui_state.workspace_canvas.sendToBack(referenceHolder.path);
            }
        }
        models.ui_state.workspace_canvas.renderAll();
    }
    else {
        if (referenceHolder.path) {
            models.ui_state.workspace_canvas.remove(referenceHolder.path);
            models.ui_state.workspace_canvas.remove(referenceHolder.circle);
        }
        referenceHolder.path = null;
        referenceHolder.circle = null;
    }
}

views.RedrawConnector = function() {

    drawOrUpdateConnector(
        models.ui_state.connector.IsVisible(),
        models.ui_state.connector.StartX(),
        models.ui_state.connector.StartY(),
        models.ui_state.connector.EndX(),
        models.ui_state.connector.EndY(),
        models.ui_state.connector,
        "#900",
        true
    );

}

views.RedrawSuggestedConnector = function() {

    drawOrUpdateConnector(
        models.SuggestedConnection.IsVisible(),
        models.SuggestedConnection.FromPoint().X,
        models.SuggestedConnection.FromPoint().Y,
        models.SuggestedConnection.ToPoint().X,
        models.SuggestedConnection.ToPoint().Y,
        models.SuggestedConnection,
        "#a6a6a6",
        false
    );
}

views.RedrawWorkspace = function(element, valueAccessor) {
                
    // Draw connectors between the nodes first
    $.each(models.current_nodes(), function(i, node) {
        if (node.Inputs) {
            $.each(node.Inputs(), function(i, val) {
                if (node.inputPaths == undefined) {
                    node.inputPaths = {};
                    node.inputCircles = {};
                }

                var sourceNode = models.GetNodeById(val);
                if (sourceNode != null) { // If we're still loading up the nodes, this may be null, that's ok, we're redraw again in a minute
                    var connectorParams = getConnectorParameters(sourceNode, node);
    
                    // If we've already draw this connector, just update the params
                    if (node.inputPaths[val]) {
                        var arrow = node.inputPaths[val];
    
                        // Update the coords of arrow.path to reflect the new positions of the nodes
                        arrow.path[0][1] = connectorParams.StartX;
                        arrow.path[0][2] = connectorParams.StartY;
                        arrow.path[1][1] = connectorParams.CurvePointX;
                        arrow.path[1][2] = connectorParams.CurvePointY;
                        arrow.path[1][3] = connectorParams.EndX;
                        arrow.path[1][4] = connectorParams.EndY;
                        arrow.set("top", connectorParams.Top);
                        arrow.set("left", connectorParams.Left);
                        arrow.set("height", connectorParams.Height);
                        arrow.set("width", connectorParams.Width);
    
                        circle = node.inputCircles[val];
                        circle.set("top", connectorParams.EndPointY);
                        circle.set("left", connectorParams.EndPointX);
                    }
                    else {
                        // Can't find this connector, add it
                        node.inputPaths[val] = new fabric.Path("M" + connectorParams.StartX + " " + connectorParams.StartY  + " Q" + connectorParams.CurvePointX  + "," + connectorParams.CurvePointY + " " + connectorParams.EndX  + "," + connectorParams.EndY, {
                            strokeWidth: 2,
                            stroke: "#666",
                            fill: "",
                            top: connectorParams.Top,
                            left: connectorParams.Left,
                            height: connectorParams.Height, 
                            width: connectorParams.Width
                        });
    
                        models.ui_state.workspace_canvas.add(node.inputPaths[val]);
                        models.ui_state.workspace_canvas.sendToBack(node.inputPaths[val]);
    
                        node.inputCircles[val] = new fabric.Circle({
                            top: connectorParams.EndPointY,
                            left: connectorParams.EndPointX,
                            strokeWidth: 1,
                            radius: 4,
                            fill: '#666',
                            stroke: 'none'
                        });
    
                        node.inputCircles[val].hasBorders = false;
                        models.ui_state.workspace_canvas.add(node.inputCircles[val]);
                        models.ui_state.workspace_canvas.sendToBack(node.inputCircles[val]);
                    }
                }
            });
        }
    });

    $.each(models.current_nodes(), function(i, node) {

        // Keep a reference to the canvas object for this
        // node on the node itself, if it already exists
        // then just move it on redraws
        if (node.iconGroup) {
            node.iconGroup.top = node.Top() + 40; // ((48 + 8 + 24) / 2), all icons are 48 px high, text is 24 px high with 8px spacer
            if (node.Inputs) {
                if (node.Type === "DataSource" || node.Type === "DataProcessor") {
                    node.iconGroup.left = node.Left() + 24; // Group goes from -16 to +64, mid point is 24
                }
                else {
                    node.iconGroup.left = node.Left() + 16; // Group goes from -16 to +48, mid point is 16 
                }
            }
            else {
                node.iconGroup.left = node.Left() + 32; // Group does from 0 to +64, mid point is 32
            }

            // Check the text is still right
            var textObj = node.iconGroup.getObjects()[2];
            if (textObj.getText() !== node.Name()) {
                textObj.setText(node.Name());
            }
        }
        else {
            node.iconGroup = new fabric.Group();
            node.iconGroup.hasControls = false;
            node.iconGroup.hasBorders = false;
                    
            var fillColor = '#fff';
            if (node == models.SelectedNode()) {
                fillColor = '#ccf';
            }

            // Draw border / square background 48 x 48
            var rect = new fabric.Rect({
                top: node.Top() + 24, //  (48 / 2)
                left: node.Left() + 24, // (48 / 2)
                height: 48,
                width: 48,
                stroke: '#111',
                strokeWidth: 3,
                rx: 5,
                ry: 5,
                fill: fillColor 
            });

            node.iconGroup.add(rect);

            // Draw the symbol, offet by 8 to move it into the centre of the rect
            var symbol = new fabric.Path(node.SymbolPath, { 
                top: node.Top() + 24, // (32 / 2) + 8 
                left: node.Left() + 24, // (32 / 2) + 8
                fill: "#111",
                width: 32,
                height: 32
            });

            // scale up from 32x32 to 48x48
            symbol.scale(1.5);
                    
            node.iconGroup.add(symbol);

            // Draw the name below the icon
            var text = new fabric.Text(node.Name(), {
                fontFamily: 'Delicious_500', 
                left: node.Left() + 32, // (64 / 2), Half text width 
                top: node.Top() + 68, // 48 + 8 + (24 / 2), Icon height plus half of text height plus 8px spacer
                width: 64,
                height: 24,
                fontSize: 18,
                textAlign: "Center",
                fill: '#111'
            });

            node.iconGroup.add(text);

            // If the node exposes results, render a lollipop on the right
            if (node.Type === "DataSource" || node.Type === "DataProcessor") {
                var line = new fabric.Line([
                    node.Left() + 48,
                    node.Top() + 24, // (48 / 2), half way down the right hand edge of the rect
                    node.Left() + 60,
                    node.Top() + 24 // (48 / 2)
                ], { 
                    strokeWidth: 3
                });

                node.iconGroup.add(line);

                var circle = new fabric.Circle({
                    top: node.Top() + 24, // (48 / 2), half way down the right hand edge of the rect
                    left: node.Left() + 60,
                    strokeWidth: 3,
                    radius: 4,
                    fill: '#f00',
                    stroke: '#111'
                });

                circle.hasBorders = false;
                node.iconGroup.add(circle);
            }

            // If the node has Inputs, render a lollipop on the left
            if (node.Inputs) {
                var line = new fabric.Line([
                    node.Left() - 8,
                    node.Top() + 24, // (48 / 2), half way down the right hand edge of the rect
                    node.Left(),
                    node.Top() + 24 // (48 / 2)
                ], { 
                    strokeWidth: 3
                });

                node.iconGroup.add(line);

                var arc = new fabric.Path("M4 0 a4 4 0 0 1 0 8", { 
                    top: node.Top() + 24,
                    left: node.Left() - 12,
                    fill: "none",
                    width: 8,
                    height: 8,
                    stroke: '#111',
                    strokeWidth: 3
                });

                arc.hasBorders = false;
                node.iconGroup.add(arc);
            }

            models.ui_state.workspace_canvas.add(node.iconGroup);
        }
    });

    models.ui_state.workspace_canvas.renderAll();
}

var _dataSubscription = null;

views.UpdateSelectedConnector = function(connector) {

    if (connector) {
        var destNode = models.GetNodeById(connector.toNodeId);
        if (destNode.inputPaths) {
            destNode.inputPaths[connector.fromNodeId].set("stroke", "#900");
            destNode.inputCircles[connector.fromNodeId].set("fill", "#900");
        }
    }
    else {
        $.each(models.current_nodes(), function(i, node) {
            if (node.inputPaths) {
                for (var fromNodeId in node.inputPaths) {
                    node.inputPaths[fromNodeId].set("stroke", "#666");
                    node.inputCircles[fromNodeId].set("fill", "#666");
                }
            }
        });
    }

    models.ui_state.workspace_canvas.renderAll();
}

views.UpdateSelectedNode = function(node) {

    if (node) {
        // Change this node's color to indicate selection
        if (node.iconGroup) {
            node.iconGroup.item(0).set("fill", "#ccf");
        }

        // Reset the color of other nodes
        $.each(models.current_nodes(), function(i, otherNode) {
            if (otherNode != node) {
                if (otherNode.iconGroup) {
                    otherNode.iconGroup.item(0).set("fill", "#fff");
                }
            }
        });

        models.ui_state.workspace_canvas.renderAll();
    }
    else {
                
        $.each(models.current_nodes(), function(i, node) {
            if (node.iconGroup) {
                node.iconGroup.item(0).set("fill", "#fff");
            }
        });
        models.ui_state.workspace_canvas.renderAll();
    }
}

views.RenderSelectedNodeResults = function(element, valueAccessor) {
    $(element).children().hide();
    var node = valueAccessor();
    if (node() && node().RenderResults ) {
        // If this node does not already have a div for its results, create one
        var container = $(element).find("div[data-results-node-id='" + node().Id + "']");
        if (container.length === 0) {
            container = $("<div id='result_container_" + node().Id + "' data-results-node-id='" + node().Id + "'></div>");
            $(element).append(container);
        }
        container.show();
    }
}

views.RenderDraggableColumn = function (element) {
    var connector = ".connectedColumnList";
    $(element).draggable({
        connectToSortable: connector,
        helper: "clone",
        revert: "invalid",
        start: function( event, ui ) {
            // as this draggable item doesn't have a width from it's parent, set it explicitly
            // based on the current calculated width of an item in the list (i.e. prev)
            $(ui.helper).width($(ui.helper).prev().width());
        }
    });
};

views.RenderSortableColumnList = function (element, valueAccessor, allBindingsAccessor, viewModel) {
    var connector = ".connectedColumnList";
    var values = valueAccessor();
    var $element = $(element),
        data = values['data'],
        options = {
            connectWith: connector,
            dropOnEmpty: true,
            revert: true,
            start: function (event, ui) {
                if (ui.item.hasClass("selectedColumn")) {
                    viewModel.removeAt = ui.item.prevAll().length;
                }
            },
            stop: function (event, ui) {
                if (viewModel.removeAt != null) {
                    if (values['onMove'] != null) {
                        values['onMove'](viewModel.removeAt, ui.item.prevAll().length);
                    }
                    data.splice(viewModel.removeAt, 1);
                    data.splice(ui.item.prevAll().length, 0, parseInt(ui.item.attr("data-bind-col-index")));
                    ui.item.remove();
                    viewModel.removeAt = null;
                }
            },
            receive: function (event, ui) {
                if (values['onDrop'] != null) {
                    values['onDrop'](droppedPosition, parseInt(ui.item.attr("data-bind-col-index")));
                }
                var droppedPosition = $(this).children(".availableColumn").prevAll().length;
                data.splice(droppedPosition, 0, parseInt(ui.item.attr("data-bind-col-index")));
                $(event.target).children(".availableColumn").remove();
            }
        };

    $element.sortable(options).disableSelection();
};

views.DatePickerInit = function(element, valueAccessor, allBindingsAccessor) {
    //initialize datepicker with some optional options
    var options = allBindingsAccessor().datepickerOptions || {},
        $el = $(element);

    var onDateChange = function() {
        var observable = valueAccessor();
        observable($el.datepicker("getDate"));
    };

    options.onSelect = onDateChange;
    $el.change(onDateChange);

    $el.mask("9999-99-99");
    $el.datepicker(options);

    //handle disposal (if KO removes by the template binding)
    ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
        $el.datepicker("destroy");
    });

};
    
views.DatePickerUpdate = function(element, valueAccessor) {
    var value = ko.utils.unwrapObservable(valueAccessor()),
        $el = $(element);

    //handle date data coming via json from Microsoft
    if (String(value).indexOf('/Date(') == 0) {
        value = new Date(parseInt(value.replace(/\/Date\((.*?)\)\//gi, "$1")));
    }

    var current = $el.datepicker("getDate");

    if ((value != undefined) && (value - current !== 0)) {
        $el.datepicker("setDate", value);
    }
};

views.TimePickerInit = function(element, valueAccessor, allBindingsAccessor) {
    var $el = $(element);
    $el.mask("99:99");
};
    
views.TimePickerUpdate = function(element, valueAccessor) {
    
};

views.NumericInputInit = function(element, valueAccessor, allBindingsAccessor) {
    $(element).numeric();

    $(element).change(function() {
        var observable = valueAccessor();
        observable(parseFloat($(element).val()));
    });
};

views.NumericInputUpdate = function(element, valueAccessor) {
    var value = ko.utils.unwrapObservable(valueAccessor()),
        $el = $(element);

    var current = parseFloat($el.val());

    if ((value != undefined) && (value - current !== 0)) {
        $el.val(value);
    }
};