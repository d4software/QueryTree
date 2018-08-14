// 'events' Module
//
// This file contains controllers for responding to user/system events
//
// Depends on: knockout.js, models.js, utils.js, platform-specific.js, backend.js

// Helper function to get the mouse position on the
// canvas, based on a jQuery event object 'e'
var getMouse = function(event) {
    var workspace_pos = $("#workspace_canvas").offset();
    if (event.touches && event.touches.length > 0) {
        return { x: event.touches[0].pageX - workspace_pos.left - 1, y: event.touches[0].pageY - workspace_pos.top };
    }
    else {
        return { x: event.pageX - workspace_pos.left - 1, y: event.pageY - workspace_pos.top };
    }
}

events = {};
        
events.OnBottomPanelResize = function(event, ui) {

    events.OnResultsPanelResize(ui.offset.top - $("#qt-container").offset().top);
}

events.SetBottomPanelSize = function() {
    $("div#bottom_panel").css("height", $(window).height() - ($("div#top_panel").height() + $("div#navbar").height()) + "px");
    $("div#bottom_panel").find(".flexibleHeight").css("height", $("div#bottom_panel").height() - 12);
}

events.OnResultsPanelResize = function(resizerPosition) {
    var topPanelHeight = resizerPosition;
    var bottomPanelHeight = $("div#qt-container").height() - resizerPosition;

    $("div#top_panel").css("height", topPanelHeight + "px");
    $("div#bottom_panel").css("height", bottomPanelHeight + "px");

    var div = $("#workspace");
    models.ui_state.workspace_canvas.setWidth(Math.max(div.width() - 15, models.MaxNodesWidth()));
    models.ui_state.workspace_canvas.setHeight(Math.max(div.height() - 3, models.MaxNodesHeight()));
    models.ui_state.workspace_canvas.calcOffset();

    $("div#bottom_panel").find(".flexibleHeight").css("height", $("div#bottom_panel").height() - 12);

    if (models.SelectedNode() && models.SelectedNode().RenderResults) {
        models.SelectedNode().RenderResults($("#nonTabularResultsContainer > div[data-results-node-id='" + models.SelectedNode().Id + "']"), models);
    }
}

events.OnToolDrag = function(event, ui, tool) {
    var helperPos = ui.helper.offset();
    var workspacePos = $("#workspace_canvas").offset();

    var dropPosition = {
        left: (helperPos.left - workspacePos.left) - 12,
        top: (helperPos.top - workspacePos.top) + 24
    };

    // Determine whether this type of tool has a receiver, if not then don't auto connect
    if (tool.AllowConnectOnDrop) {

        if (tool.MaxInputs > 0) {

            var suggestNode = models.GetNodeInSuggestionRange(dropPosition.left, dropPosition.top);

            if (suggestNode && suggestNode.GetTransmitterPoint) {

                models.SuggestedConnection.FromNodeId(suggestNode.Id);
                models.SuggestedConnection.ToNodeId(null);

                if (Math.abs((dropPosition.top - 24) - suggestNode.Top()) < 10) {
                    dropPosition.top = suggestNode.Top() + 24;
                }

                var horizontalDistance = Math.abs(dropPosition.left - suggestNode.Left() + 12);

                if (horizontalDistance > 110 && horizontalDistance < 130) {
                    dropPosition.left = suggestNode.Left() + 120 - 12;
                }

                var recvPoint = {
                    x: dropPosition.left,
                    y: dropPosition.top
                };

                models.SuggestedConnection.ToDroppingPoint.X(recvPoint.x);
                models.SuggestedConnection.ToDroppingPoint.Y(recvPoint.y);
                models.SuggestedConnection.IsVisible(true);
            }
            else {
                models.SuggestedConnection.IsVisible(false);
            }
        }
    }

    $("#dropTarget").offset({
        top: dropPosition.top + workspacePos.top - 24,
        left: dropPosition.left + workspacePos.left + 12
    });
}

events.OnToolDrop = function(event, ui, tool) {
    var workspacePos = $("#workspace_canvas").offset();
    var dropPos = $("#dropTarget").offset();
    var connected = false;
    if (tool) {
        var newNode = tool.createNode(
                tool.Title + " " + (tool.CreatedCount + 1),
                dropPos.top - workspacePos.top, 
                dropPos.left - workspacePos.left);

        models.current_nodes.push(newNode);

        if (models.SuggestedConnection.IsVisible() === true) {
            newNode.Inputs.push(models.SuggestedConnection.FromNodeId());
            newNode.OnInputsUpdated(models);
            connected = true;
        }

        events.LoadNodeOptionsTemplate(newNode, function() {
            // Wait until the options template is loaded before selecting the 
            // node in case it wants to modify its options UI at all
            events.SelectNode(newNode);
            if (newNode.Tool.OpenOptionsOnDrop || connected) {
                events.ShowOptionsDialog();
            }
        });
    }
}

events.LoadNodeOptionsTemplate = function(newNode, callback) {
    // Load the node's options template into the DOM
    $("#node_options_container").append(`
        <div class='modal' data-node-id='` + newNode.Id + `' role='dialog'>
            <div class='modal-dialog' role='document'>
                <div class='modal-content'>
                    <div class='modal-header'>
                        <button type='button' class='close' data-dismiss='modal' aria-label='Close'><span aria-hidden='true'>&times;</span></button>
                        <h4 class='modal-title'>Tool Options</h4>
                    </div>
                    <div class='modal-body'>
                    </div>
                    <div class="modal-footer">
                        <button type='button' class='btn btn-danger remove'>Remove Tool</button>
                        <button type='button' class='btn btn-primary ok'>OK</button>
                    </div>
                </div>
            </div>
        </div>
    </div>`);
    
    $("#node_options_container > div[data-node-id='" + newNode.Id + "'] div.modal-body").load(newNode.OptionsTemplateUrl, function() {
        // Wait till now to do this to avoid errors on full page applyBingings
        var optionsContainer = $("#node_options_container > div[data-node-id='" + newNode.Id + "'] div.modal-body");
        ko.applyBindings(newNode, optionsContainer[0]);
        if (newNode.Tool.HelpUrl) {
            optionsContainer.append("<div class='form-group toolHelpLink'><a href='" + newNode.Tool.HelpUrl + "' target='_blank'>How does this tool work?</a>");
        }

        $("#node_options_container > div[data-node-id='" + newNode.Id + "'] button.remove").click(events.ActiveOptionsModalRemove);
        $("#node_options_container > div[data-node-id='" + newNode.Id + "'] button.ok").click(events.ActiveOptionsModalOK);
        
        if (callback) {
            callback();
        }
    });
}

events.OnWindowResize = function() {
    events.OnResultsPanelResize($("#resize_bar").offset().top - $("#qt-container").offset().top);
}

var snapToNode = function(staticNode, snappingNode, rightToLeft) {

    var mult = 1;

    if (rightToLeft) {
        mult = -1;
    }

    if (Math.abs(snappingNode.Top() - staticNode.Top()) < 10) {
        snappingNode.Top(staticNode.Top());
    }

    var horizontalDistance = Math.abs(snappingNode.Left() - staticNode.Left());

    if (horizontalDistance > 110 && horizontalDistance < 130) {
        snappingNode.Left(staticNode.Left() + (120 * mult));
    }
}

events.OnCanvasMouseMove = function(e) {
    var mouse = getMouse(e);
    if (models.ui_state.dragging_handle) {
        models.ui_state.dragging_handle.node.Top(mouse.y - models.ui_state.dragging_handle.y);
        models.ui_state.dragging_handle.node.Left(mouse.x - models.ui_state.dragging_handle.x);

        var suggested = false;

        // If this node takes inputs, check other nodes' position, if one is nearby suggest an auto-connect
        if (models.ui_state.dragging_handle.node.GetReceiverPoint) {

            // If there is a node close by and it's not already connected
            var receiverPoint = models.ui_state.dragging_handle.node.GetReceiverPoint();
            var suggestNode = models.GetNodeInSuggestionRange(receiverPoint.x, receiverPoint.y, true, models.ui_state.dragging_handle.node.Id);

            if (suggestNode && models.ui_state.dragging_handle.node.IsInputAllowed() === true && models.ui_state.dragging_handle.node.Inputs.indexOf(suggestNode.Id) == -1) {
                models.SuggestedConnection.FromNodeId(suggestNode.Id);
                models.SuggestedConnection.ToNodeId(models.ui_state.dragging_handle.node.Id);
                models.SuggestedConnection.IsVisible(true);
                suggested = true;
            }
            else {
                models.SuggestedConnection.IsVisible(false);
            }

            if (suggestNode != null) {
                snapToNode(suggestNode, models.ui_state.dragging_handle.node);
            }
        }

        // No suggested inputs near by, look for a suggested output
        if (suggested === false && models.ui_state.dragging_handle.node.GetTransmitterPoint) {

            // If there is an outputting node near by
            var transmitterPoint = models.ui_state.dragging_handle.node.GetTransmitterPoint();
            var suggestNode = models.GetNodeInSuggestionRange(transmitterPoint.x, transmitterPoint.y, false, models.ui_state.dragging_handle.node.Id);

            if (suggestNode && suggestNode.IsInputAllowed() === true && suggestNode.Inputs.indexOf(models.ui_state.dragging_handle.node.Id) == -1) {
                models.SuggestedConnection.FromNodeId(models.ui_state.dragging_handle.node.Id);
                models.SuggestedConnection.ToNodeId(suggestNode.Id);
                models.SuggestedConnection.IsVisible(true);
            }
            else {
                models.SuggestedConnection.IsVisible(false);
            }

            if (suggestNode != null) {
                snapToNode(suggestNode, models.ui_state.dragging_handle.node, true);
            }
        }
    }
    else if (models.ui_state.connecting_handle) {
        models.ui_state.connector.EndX(mouse.x);
        models.ui_state.connector.EndY(mouse.y);
    }
    else {
        var node = models.GetNodeAt(mouse.x, mouse.y);
        if (node != null) {
            $("html,body").css("cursor", "move");
        }
        else {
            $("html,body").css("cursor", "");
        }
    }
};

events.FetchSelectedNodeData = function(startRow, rowCount, callback) {
    if (models.SelectedNode() != null) {

        if (models.SelectedNode().IsConfigured() === true) {
            if (models.SelectedNodeHasRender() === false) {
            	var requestedNodeId = models.SelectedNode().Id;
            	models.SelectedNodeStatus("not_ready");

            	startRow = startRow || 0;
            	rowCount = rowCount || models.DataPageSize();

            	// Call server to get the data
            	backend.LoadData(models.ServerQueryKey, models.GetCoreNodeSettings(), models.SelectedNode().Id, startRow, rowCount, "JSON", null, function (data) {

            		if (data.status && models.SelectedNode() && models.SelectedNode().Id === requestedNodeId) {
            		    models.SelectedNodeStatus(data.status)

            		    models.SelectedNode().SetColumns(data.columns, data.columnTypes);

            			if (data.status === "ok") {
            				models.CurrentData(data.rows);
            				models.CurrentRowStart(startRow + 1);
            				models.CurrentRowEnd(startRow + data.rows.length);
                            models.CurrentRowsTotal(data.rowCount);
                            models.CurrentDataColumns(data.columns);
            			}

            			if (data.status === "error") {
            				models.SelectedNode().ErrorText("Something went wrong while trying to fetch the data. Please contact an administrator.")
            			}
            		}
            	});
            }
            else {
            	models.CurrentData(null);
            	models.CurrentRowStart(null);
            	models.CurrentRowEnd(null);
                models.CurrentRowsTotal(null);
                models.CurrentDataColumns(null);

            	// This node wants to render it's own results, so tell it to do so now
            	models.SelectedNode().RenderResults($("#nonTabularResultsContainer > div[data-results-node-id='" + models.SelectedNode().Id + "']"), models);
            }
        }
    }
}

events.SelectNode = function(node) {
    models.SelectedNode(node);
    models.SelectedNodeStatus(null);
    models.CurrentData(null);
    models.CurrentRowStart(0);
    models.CurrentRowEnd(null);
    models.CurrentRowsTotal(null);
    if (node != null) {
        node.OnSelected(models);
    }
}

events.OnCanvasMouseUp = function (e) {
    var modelChanged = false;
    var mouse = getMouse(e);
    if (models.ui_state.dragging_handle) {
        if (models.SelectedNode() != models.ui_state.dragging_handle.node) {
            events.SelectNode(models.ui_state.dragging_handle.node);
            events.FetchSelectedNodeData(0, models.DataPageSize());
        }

        if (models.SuggestedConnection.IsVisible()) {

            var node = models.GetNodeById(models.SuggestedConnection.ToNodeId());
            node.Inputs.push(models.SuggestedConnection.FromNodeId());
            node.OnInputsUpdated(models);

            models.SuggestedConnection.IsVisible(false);

            modelChanged = true;
        }
    }
    else {
        events.SelectNode(null);
    }
    models.ui_state.dragging_handle = null;

    if (models.ui_state.connecting_handle) {
        var connectToNode = models.GetNodeConnectionHandle(mouse.x, mouse.y, models.ui_state.connecting_handle.type);
        if (connectToNode && connectToNode.node.IsInputAllowed() && models.IsCircularDependency(models.ui_state.connecting_handle.node, connectToNode.node) == false) {
            if (models.ui_state.connecting_handle.type == 'input') {
                models.ui_state.connecting_handle.node.Inputs.push(connectToNode.node.Id);
                models.ui_state.connecting_handle.node.OnInputsUpdated(models);
            }
            else {
                connectToNode.node.Inputs.push(models.ui_state.connecting_handle.node.Id);
                connectToNode.node.OnInputsUpdated(models);
            }

            modelChanged = true;
        }

        models.ui_state.connecting_handle = null;
        models.ui_state.connector.IsVisible(false)
    }
    else if (models.ui_state.selecting_connector) {
        models.SelectedConnector(models.ui_state.selecting_connector);
    }
    else {
        models.SelectedConnector(null);
    }
    models.ui_state.selecting_connector = null;

    if (modelChanged) {
        backend.SaveQuery(models.ServerQueryKey, models.GetCoreNodeSettings());
    }
}

events.OnCanvasMouseDown = function (e) {
    var mouse = getMouse(e);

    models.ui_state.dragging_handle = models.GetNodeDragHandle(mouse.x, mouse.y);
    if (models.ui_state.dragging_handle == null) {
        models.ui_state.connecting_handle = models.GetNodeConnectionHandle(mouse.x, mouse.y);

        if (models.ui_state.connecting_handle) {
            models.ui_state.connector.StartX(mouse.x);
            models.ui_state.connector.StartY(mouse.y);
            models.ui_state.connector.EndX(mouse.x);
            models.ui_state.connector.EndY(mouse.y);
            models.ui_state.connector.IsVisible(true);
        }
        else {
            models.ui_state.selecting_connector = models.GetConnectorAt(mouse.x, mouse.y);
        }
    }
},

events.OnCanvasDoubleClick = function (e) {
    if (models.SelectedNode() != null) {
        events.ShowOptionsDialog();
    }

    // Clear move cursor that might be hanging around from the tool hover
    $("html,body").css("cursor", "");
},

events.UpdateSelectedNodeOptions = function () {
    // Call OnOptionsUpdated on the selected node
    var node = models.SelectedNode();
    if (node) {
        node.OnOptionsUpdated(models);
    }
},

events.ActiveOptionsModalOK = function() {
    events.UpdateSelectedNodeOptions();
    var optionsDiv = $(".modal[data-node-id='" + models.SelectedNode().Id + "']");
    optionsDiv.modal('hide');
    backend.SaveQuery(models.ServerQueryKey, models.GetCoreNodeSettings(), function () {
        events.FetchSelectedNodeData();
    });
}

events.ActiveOptionsModalRemove = function() {
    var optionsDiv = $(".modal[data-node-id='" + models.SelectedNode().Id + "']");
    optionsDiv.modal('hide');
    events.DeleteSelectedObject();
}

events.ShowOptionsDialog = function () {
    var optionsDiv = $(".modal[data-node-id='" + models.SelectedNode().Id + "']");
    optionsDiv.modal();
};
        
events.DeleteSelectedObject = function() {
    if (models.SelectedNode() != null) {
        $("#node_options_container > div[data-node-id='" + models.SelectedNode().Id + "']").remove();
        models.RemoveNode(models.SelectedNode().Id);
    }
    else if (models.SelectedConnector() != null) {
        models.RemoveConnector(models.SelectedConnector().fromNodeId, models.SelectedConnector().toNodeId);
    }

    backend.SaveQuery(models.ServerQueryKey, models.GetCoreNodeSettings());
}

events.PagerStart = function() {
    if (models.SelectedNode() != null) {
        events.FetchSelectedNodeData(0, models.DataPageSize());
    }
}

events.PagerEnd = function() {
    if (models.SelectedNode() != null) {
        var start = (parseInt(models.CurrentRowsTotal() / models.DataPageSize()) * models.DataPageSize());
        if (start == models.CurrentRowsTotal()) {
            start -= models.DataPageSize();
        }
        var count = models.CurrentRowsTotal() - start;
        events.FetchSelectedNodeData(start, count);
    }
}

events.PagerNext = function() {
    if (models.SelectedNode() != null) {                
        events.FetchSelectedNodeData(models.CurrentRowStart() - 1 + models.DataPageSize(), models.DataPageSize());
    }
}

events.PagerPrev = function() {
    if (models.SelectedNode() != null) {
        events.FetchSelectedNodeData(models.CurrentRowStart() - 1 - models.DataPageSize(), models.DataPageSize());
    }
}
        
events.OnKeyUp = function(e) {
    if ($(document.activeElement).is("body")) {
        if (e.which === 46 || e.which === 8) { // Delete and backspace
            events.DeleteSelectedObject();
            return false;
        }
    }
}

events.OnKeyPress = function(e) {
    if (e.which === 13) { // Enter
        $("button.ui-state-focus").click(); // Click any button that currently has focus
        return false;
    }
}
