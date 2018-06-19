// Tell knockout about all our views
ko.bindingHandlers.canvas_symbol = {
    init: views.RenderToolbarSymbol
}

ko.bindingHandlers.draggable_tool = {
    init: views.RenderDraggableToolbarButton
}
ko.bindingHandlers.droppable_area = {
    init: views.RenderDroppableArea
}

ko.bindingHandlers.draw_nodes = {
    init: views.CreateWorkspace,
    update: views.RedrawWorkspace
}

ko.bindingHandlers.render_options = {
    update: views.RenderOptions
}

ko.bindingHandlers.render_results = {
    update: views.RenderSelectedNodeResults
}

ko.bindingHandlers.draggable_column = {
    init: views.RenderDraggableColumn
}

ko.bindingHandlers.draggable_column_trash = {
    init: views.RenderDraggaleColumnTrash
}
        
ko.bindingHandlers.sortable_column_list = {
    init: views.RenderSortableColumnList
};

ko.bindingHandlers.datepicker = {
    init: views.DatePickerInit,
    update: views.DatePickerUpdate
};

ko.bindingHandlers.timepicker = {
    init: views.TimePickerInit,
    update: views.TimePickerUpdate
};

ko.bindingHandlers.numeric = {
    init: views.NumericInputInit,
    update: views.NumericInputUpdate
};

$(document).ready(function() {

    $("input:text").focus(function() {
        $(this).select();
    });

    // Wire up all the UI events to their event handlers
    $("#workspace_canvas").bind("touchmove", events.OnCanvasMouseMove);
    $("#workspace_canvas").mousemove(events.OnCanvasMouseMove);
    $("#workspace_canvas").bind("touchstart", events.OnCanvasMouseDown);
    $("#workspace_canvas").mousedown(events.OnCanvasMouseDown);
    $("#workspace_canvas").bind("touchend", events.OnCanvasMouseUp);
    $("#workspace_canvas").mouseup(events.OnCanvasMouseUp);
    $("#workspace_canvas").dblclick(events.OnCanvasDoubleClick);

    $(window).resize(events.OnWindowResize);

    models.ui_state.connector.IsVisible.subscribe(views.RedrawConnector);
    models.ui_state.connector.StartX.subscribe(views.RedrawConnector);
    models.ui_state.connector.StartY.subscribe(views.RedrawConnector);
    models.ui_state.connector.EndX.subscribe(views.RedrawConnector);
    models.ui_state.connector.EndY.subscribe(views.RedrawConnector);

    models.SuggestedConnection.FromPoint.subscribe(views.RedrawSuggestedConnector);
    models.SuggestedConnection.ToPoint.subscribe(views.RedrawSuggestedConnector);
    models.SuggestedConnection.IsVisible.subscribe(views.RedrawSuggestedConnector);

    models.SelectedNode.subscribe(views.UpdateSelectedNode);
    models.SelectedConnector.subscribe(views.UpdateSelectedConnector);

    $("#showConfig").click(events.ShowOptionsDialog);
    $("#showQuery").click(events.ShowQueryForSelectedObject);
    $("#delete").click(events.DeleteSelectedObject);

    $(".notificationBar > .closeButton").click(function(e) { $(this).parent().slideUp("slow"); } );

    $("#PagerStart").click(events.PagerStart);
    $("#PagerPrev").click(events.PagerPrev);
    $("#PagerNext").click(events.PagerNext);
    $("#PagerEnd").click(events.PagerEnd);

    $(window).keyup(events.OnKeyUp);
    $(window).keypress(events.OnKeyPress);

    models.ResultsOnly($.QueryString["resultsOnly"] == "true");

    if (models.SelectedNode() != null) {
        events.FetchSelectedNodeData();
    }

    ko.applyBindings(models, $("#binding-root")[0]);

    $("#resize_bar").draggable({
        helper: function (event) {
            return $("<div class='bottomPanelResizer'></div>");
        },
        axis: "y",
        create: events.SetBottomPanelSize,
        stop: events.OnBottomPanelResize
    });

    $("div#bottom_left_panel").show();
    events.OnWindowResize();
});

var getQuery = function () {
    var query = "";

    var data = {
        Nodes: []
    }
    
    $.each(models.current_nodes(), function (i, node) {
        data.Nodes.push(node.GetSaveSettings());
    });

    if (models.SelectedNode() != null) {
        data.SelectedNodeId = models.SelectedNode().Id;
    }

    query = JSON.stringify(data);
    return query;
}

var loadNode = function (models, node) {
    var tool = models.findTool(node.Type);
    if (tool) {
        var newNode = tool.createNode(node.Name, node.Top, node.Left, node.Id);
        newNode.LoadSettings(node, models);
        models.current_nodes.push(newNode);
    }
}

var loadQuery = function (events, models, query) {
    models.RemoveEverything();

    var data = JSON.parse(query);
    var nonTableNodes = [];

    // Load data tables first, no need to worry about dependencies
    $.each(data.Nodes, function (i, node) {
        if (node.Type == "Data Table") {
            loadNode(models, node);
        }
        else {
            nonTableNodes.push(node)
        }
    })


    while (nonTableNodes.length > 0) {
        var node = nonTableNodes.splice(0, 1)[0];

        var configureNow = true;

        if (node.Inputs != null) {
            $.each(node.Inputs, function (ii, inputId) {
                var configuredNode = models.GetNodeById(inputId);
                var pendingNode = nonTableNodes.find(function (n) { return n.Id == inputId; });
                if (configuredNode == null && pendingNode != null) {
                    nonTableNodes.push(node);
                    configureNow = false;
                    return false;
                }
            });
        }

        if (configureNow == true) {
            loadNode(models, node);
        }
    }

    $.each(models.current_nodes(), function (i, node) {
        events.LoadNodeOptionsTemplate(node);
    });

    if (data.SelectedNodeId) {
        events.SelectNode(models.GetNodeById(data.SelectedNodeId));
        events.FetchSelectedNodeData();
    }
};