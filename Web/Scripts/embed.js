(function () {

    var loadNode = function (models, node) {
        var tool = models.findTool(node.Type);
        if (tool) {
            var newNode = tool.createNode(node.Name, node.Top, node.Left, node.Id);
            newNode.LoadSettings(node, models);
            models.current_nodes.push(newNode);
        }
    }

    var loadquery = function (events, models, query) {
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

    window.querytree = {
	    initialize: function(options) {
	        this.options = options;
	        var container = document.getElementById(options.containerId);

            var iframe = document.createElement('iframe');
            iframe.frameBorder=0;
            iframe.width="100%";
            iframe.height = "100%";
            var url = "/Embed/Qt/" + options.databaseId;
            if (options.resultsOnly) {
                url += "?resultsOnly=true"
            }
            iframe.setAttribute("src", url);

            container.appendChild(iframe);

            iframe.onload = function () {
                var models = this.contentWindow.models;
                var events = this.contentWindow.events;
                if (options.resultsOnly === true) {
                    models.ResultsOnly(true);
                    models.DataPageSize(100);
                }
                else {
                    models.ResultsOnly(false);
                    models.DataPageSize(10);
                }
                
                if (options.setQuery != null) {
                    loadquery(events, models, options.setQuery);
                }
                else {
                    var toolName = "Data Table"
                    var tool = models.findTool(toolName);
                    var connected = false;
                    if (tool) {
                        var newNode = tool.createNode(
                                tool.Title + " " + (tool.CreatedCount + 1),
                                30,
                                30);

                        models.current_nodes.push(newNode);

                        events.LoadNodeOptionsTemplate(newNode, function () {
                            // Wait until the options template is loaded before selecting the 
                            // node in case it wants to modify its options UI at all
                            events.SelectNode(newNode);
                            if (newNode.Tool.OpenOptionsOnDrop || connected) {
                                events.ShowOptionsDialog();
                            }
                        });
                    }
                }

                if (options.pager) {
                    options.pager.IsDataVisible(models.IsDataVisible());
                    models.IsDataVisible.subscribe(function (newValue) { options.pager.IsDataVisible(newValue) });
                    options.pager.CurrentRowStartFormatted(models.CurrentRowStartFormatted());
                    models.CurrentRowStartFormatted.subscribe(function (newValue) { options.pager.CurrentRowStartFormatted(newValue) });
                    options.pager.CurrentRowEndFormatted(models.CurrentRowEndFormatted());
                    models.CurrentRowEndFormatted.subscribe(function (newValue) { options.pager.CurrentRowEndFormatted(newValue) });
                    options.pager.CurrentRowsTotalFormatted(models.CurrentRowsTotalFormatted());
                    models.CurrentRowsTotalFormatted.subscribe(function (newValue) { options.pager.CurrentRowsTotalFormatted(newValue) });
                    options.pager.IsPreviousVisible(models.IsPreviousVisible());
                    models.IsPreviousVisible.subscribe(function (newValue) { options.pager.IsPreviousVisible(newValue) });
                    options.pager.IsNextVisible(models.IsNextVisible());
                    models.IsNextVisible.subscribe(function (newValue) { options.pager.IsNextVisible(newValue) });
                    options.pager.ShowExport(models.ShowExport());
                    models.ShowExport.subscribe(function (newValue) { options.pager.ShowExport(newValue) });
                    options.pager.ExportUrl(models.ShowExport());
                    models.ExportUrl.subscribe(function (newValue) { options.pager.ExportUrl(newValue) });
                    options.pager.ExportFileName(models.ExportFileName());
                    models.ExportFileName.subscribe(function (newValue) { options.pager.ExportFileName(newValue) });

                    options.pager.Export = models.Export;
                    options.pager.NavigateStart = events.PagerStart;
                    options.pager.NavigatePrev = events.PagerPrev;
                    options.pager.NavigateNext = events.PagerNext;
                    options.pager.NavigateEnd = events.PagerEnd;
                }
                models.ResultsOnlyLoaded(true);
            };
        },
	    getQuery: function () {
	        var query = "";

	        var container = document.getElementById(this.options.containerId);
	        var models = container.lastChild.contentWindow.models;
	    
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
        },
	    setQuery: function (query) {
	        var container = document.getElementById(this.options.containerId);

	        container.lastChild.contentWindow.$("#node_options_container").empty();
	        container.lastChild.contentWindow.$("#nonTabularResultsContainer").empty();

	        var models = container.lastChild.contentWindow.models;
	        var events = container.lastChild.contentWindow.events;

	        loadquery(events, models, query);

	        // Update scrollbars if required
	        events.OnWindowResize();
	    }
    };
})();
