ko.bindingHandlers.numeric = {
    init: function (element, valueAccessor, allBindingsAccessor) {
        $(element).numeric();

        $(element).change(function () {
            var observable = valueAccessor();
            observable(parseFloat($(element).val()));
        });
    },
    update: function (element, valueAccessor) {
        var value = ko.utils.unwrapObservable(valueAccessor()),
            $el = $(element);

        var current = parseFloat($el.val());

        if ((value != undefined) && (value - current !== 0)) {
            $el.val(value);
        }
    }
};

ko.bindingHandlers.datepicker = {
    init:  function (element, valueAccessor, allBindingsAccessor) {
        //initialize datepicker with some optional options
        var options = allBindingsAccessor().datepickerOptions || {},
            $el = $(element);

        var onDateChange = function () {
            var observable = valueAccessor();
            observable($el.datepicker("getDate"));
        };

        options.onSelect = onDateChange;
        $el.change(onDateChange);

        $el.mask("9999-99-99");
        $el.datepicker(options);

        //handle disposal (if KO removes by the template binding)
        ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
            $el.datepicker("destroy");
        });

    },
    update:  function (element, valueAccessor) {
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
    }
};

ko.bindingHandlers.timepicker = {
    init: function (element, valueAccessor, allBindingsAccessor) {
        var $el = $(element);
        $el.mask("99:99");
    },
    update: function (element, valueAccessor) {
    }
};

var databaseTableTool = new tools.DatabaseTable(),
    filterTool = new tools.Filter(),
    statsTool = new tools.Summarize(),
    joinTool = new tools.Join(),
    selectTool = new tools.Select();

var SimpleQueryBuilderViewModel = function () {

    var self = this;

    var formatNumber = function (num) {
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

    self.currentDataFull = ko.observable();
    self.HasChart = ko.observable(false);

    self.currentData = ko.computed(function() {
        if (self.HasChart() && self.currentDataFull()) {
            return self.currentDataFull().slice(self.currentRowStart() - 1, self.currentRowStart() + self.dataPageSize() - 1)
        } else {
            return self.currentDataFull();
        }
    })
    
    self.currentDataColumns = ko.observable();
    self.currentRowStart = ko.observable();
    self.currentRowStartFormatted = ko.computed(function () {
        return formatNumber(self.currentRowStart());
    });

    self.currentRowsTotal = ko.observable();
    self.currentRowsTotalFormatted = ko.computed(function () {
        return formatNumber(self.currentRowsTotal());
    });
    
    self.dataPageSize = ko.observable(10);

    self.currentRowEnd = ko.computed(function() {
        return Math.min(self.currentRowsTotal(), self.currentRowStart() + self.dataPageSize() - 1)
    });
    self.currentRowEndFormatted = ko.computed(function () {
        return formatNumber(self.currentRowEnd());
    });
    
    

    self.isPreviousVisible = ko.computed(function () {
        if (self.currentRowStart() != null) {
            return self.currentRowStart() > 1;
        }
        else {
            return false;
        }
    });

    self.isNextVisible = ko.computed(function () {
        if (self.currentRowEnd() != null) {
            return self.currentRowEnd() < self.currentRowsTotal();
        }
        else {
            return false;
        }
    });

    self.navigateStart = function () {
        if (self.selectedNode()) {
            // If HasChart() == true, we will already have the data, no need to reload from the server
            if (self.HasChart()) {
                self.currentRowStart(1);
            } else {
                self.refresh(0);
            }
        }
    }

    self.navigateEnd = function () {
        if (self.selectedNode()) {
            var start = (parseInt(self.currentRowsTotal() / self.dataPageSize()) * self.dataPageSize());
            if (start == self.currentRowsTotal()) {
                start -= self.dataPageSize();
            }
            var count = self.currentRowsTotal() - start;
            // If HasChart() == true, we will already have the data, no need to reload from the server
            if (self.HasChart()) {
                self.currentRowStart(start + 1);
            } else {
                self.refresh(start);
            }
        }
    }

    self.navigateNext = function () {
        if (self.selectedNode()) {
            // If HasChart() == true, we will already have the data, no need to reload from the server
            if (self.HasChart()) {
                self.currentRowStart(self.currentRowStart() + self.dataPageSize());
            } else {
                self.refresh(self.currentRowStart() - 1 + self.dataPageSize());
            }
        }
    }

    self.navigatePrev = function () {
        if (self.selectedNode()) {
            // If HasChart() == true, we will already have the data, no need to reload from the server
            if (self.HasChart()) {
                self.currentRowStart(self.currentRowStart() - self.dataPageSize());
            } else {
                self.refresh(self.currentRowStart() - 1 - self.dataPageSize());
            }
        }
    }

    self.section = ko.observable(1);
    self.serverQueryKey = ko.observable();

    self.filtersAllowed = ko.observable(false);
    self.statisticsAllowed = ko.observable(false);

    self.GetNodeById = function (id) {
        if (self.dataTable() && self.dataTable().Id == id) {
            return self.dataTable();
        }

        if (self.select() && self.select().Id == id) {
            return self.select();
        }

        var matches = self.dataTables()
            .filter(function (item) { return item.Id == id; });

        if (matches.length > 0) {
            return matches[0];
        }

        matches = self.joins()
            .filter(function (item) { return item.Id == id; });

        if (matches.length > 0) {
            return matches[0];
        }

        matches = self.filters()
            .filter(function (item) { return item.Id == id; });

        if (matches.length > 0) {
            return matches[0];
        }

        if (self.statistics() && self.statistics().Id == id) {
            return self.statistics();
        }

        return null;
    }

    self.dataTable = ko.observable(new nodes.DatabaseTable({ Name: "Data Source", Tool: databaseTableTool }));

    self.dataTable().selectedColumns = ko.observableArray();
        
    self.dataTable().rowCount = ko.observable();

    self.dataTable().selectedColumnCount = ko.pureComputed(function () {
        return self.dataTable().selectedColumns().filter(function (col) { return col.checked() }).length;
    }, self);

    self.select = ko.observable(new nodes.Select({ Name: "Select", Tool: selectTool }));

    self.select().showColumns = ko.observable(false);

    self.dataTable().apply = function () {
        var includedIndexes = [];
        var index = 0;

        if (self.dataTable().selectedColumns().some(function (item) { return item.checked(); })) {
            $.each(self.dataTable().selectedColumns(), function (j, column) {
                if (column.checked()) {
                    includedIndexes.push(index);
                }
                index++;
            });
        }

        $.each(self.dataTables(), function (i, table) {
            $.each(table.selectedColumns(), function (j, column) {
                if (column.checked()) {
                    includedIndexes.push(index);
                }
                index++;
            });
        });

        $.each(self.joins(), function (i, join) {
            join.CalculateColumns();
        });

        // make record of columns that have changed
        var columnRemovals = [];
        var columnTranspositions = [];
        var updateColumnsAfterChanges = self.select().IncludedColumnIndexes().length > includedIndexes.length;

        $.each(self.select().IncludedColumnIndexes(), function (oldPosition, columnIndex) {
            var newPosition = includedIndexes.indexOf(columnIndex);
            if (newPosition >= 0) {
                if (newPosition != oldPosition) {
                    columnTranspositions.push([oldPosition, newPosition]);
                }
            } else {
                columnRemovals.push(oldPosition);
            }
        });

        var statisticsCalculateIndexes = [],
            statisticGroupByIndexes = []

        if (self.statistics()) {
            statisticsCalculateIndexes = self.statistics()
                .Statistics()
                .map(function (item) { return item.AggColumn(); });

            statisticGroupByIndexes = self.statistics()
                .GroupByColumns()
                .map(function (item) { return item.index(); });
        }

        self.select().IncludedColumnIndexes(includedIndexes);

        // update columns
        if (!updateColumnsAfterChanges) {
            self.select().CalculateColumns();

            $.each(self.filters(), function (i, filter) {
                filter.SetColumns(self.select().Columns().slice(), self.select().ColumnTypes().slice());
            });
        }

        // manage column changes in subsequent tools
        var i = self.filters().length - 1;
        while (i >= 0) {
            var currentFilter = self.filters()[i];
            if (columnRemovals.indexOf(currentFilter.FilterColumnIndex()) >= 0) {
                self.removeFilter(i);
            } else {

                var transpositions = columnTranspositions.filter(function (item) { return item[0] == currentFilter.FilterColumnIndex(); });
                if (transpositions.length > 0) {
                    currentFilter.FilterColumnIndex(transpositions[0][1]);
                }
            }
            i--;
        }

        // update columns
        if (updateColumnsAfterChanges) {
            self.select().CalculateColumns();

            $.each(self.filters(), function (i, filter) {
                filter.SetColumns(self.select().Columns().slice(), self.select().ColumnTypes().slice());
            });
        }

        if (self.statistics()) {
            i = statisticGroupByIndexes.length - 1;
            while (i >= 0) {
                var groupBy = self.statistics().GroupByColumns()[i];
                if (columnRemovals.indexOf(statisticGroupByIndexes[i]) >= 0) {
                    self.statistics().RemoveGroupBy(groupBy);
                } else {

                    var transpositions = columnTranspositions.filter(function (item) { return item[0] == statisticGroupByIndexes[i]; });
                    if (transpositions.length > 0) {
                        groupBy.index(transpositions[0][1]);
                    }
                }
                i--;
            }

            i = statisticsCalculateIndexes.length - 1;
            while (i >= 0) {
                var calculate = self.statistics().Statistics()[i];
                if (columnRemovals.indexOf(statisticsCalculateIndexes[i]) >= 0) {
                    if (self.statistics().Statistics().length == 1) {
                        self.removeStatistics();
                    } else {
                        self.statistics().RemoveStatistic(calculate);
                    }
                } else {

                    var transpositions = columnTranspositions.filter(function (item) { return item[0] == statisticsCalculateIndexes[i]; });
                    if (transpositions.length > 0) {
                        calculate.AggColumn(transpositions[0][1]);
                    }
                }
                i--;
            }
        }

        self.refresh(0, function (success) {
            if (success) {
                self.goToNextSection();
            }
        });
    };

    var innerLoadTables = self.dataTable().loadTables;
    self.dataTable().loadTables = function() {
        innerLoadTables(function () {
        })
    }

    self.joins = ko.observableArray();
    self.dataTables = ko.observableArray();

    var joinSeed = 1;
    
    self.filters = ko.observableArray();

    self.filters.subscribe(function(changes) {
        if(changes[0].status === 'deleted' && self.filters().length === 0) {
            self.applyFilters();
        }
    }, null, "arrayChange");
    
    var filterSeed = 1;

    self.addFilter = function (settings) {
        var newFilter = new nodes.Filter({ Name: 'Filter ' + filterSeed, Tool: filterTool });
        filterSeed += 1;

        var input = null;
        if (self.filters().length > 0) {
            input = self.filters()[self.filters().length - 1];
        } else {
            input = self.select();
        }

        newFilter.Inputs([input.Id]);
        newFilter.OnInputsUpdated(self);

        if (settings) {
            // do not try to load input ids as we know what it will be
            settings.Inputs[0] = input.Id;

            newFilter.LoadSettings(settings, self);
        }

        newFilter.SetColumns(self.select().Columns().slice(), self.select().ColumnTypes().slice());

        self.filters.push(newFilter);

        if (self.statistics()) {
            self.statistics().Inputs([newFilter.Id]);
            self.statistics().OnInputsUpdated(self);
        }
    };

    self.removeFilter = function (index) {
        if (0 <= index && index < self.filters().length) {
            var prev = null;
            if (0 <= index - 1 && index - 1 < self.filters().length) {
                prev = self.filters()[index - 1];
            } else {
                prev = self.select();
            }

            var next = null;
            if (0 <= index + 1 && index + 1 < self.filters().length) {
                next = self.filters()[index + 1];
            } else {
                next = self.statistics();
            }

            if (prev && next) {
                // make sure settings aren't lost
                var settings = next.GetSaveSettings();

                settings.Inputs[0] = prev.Id;

                next.Inputs([prev.Id]);
                next.OnInputsUpdated(self);

                next.LoadSettings(settings, self);
            }

            self.filters.splice(index, 1);

            self.filterError(null);
        }
    };

    self.goToNextSection = function () {
        self.section(self.section() + 1);

        if (self.section() == 2) {
            self.filtersAllowed(true);
        }

        if (self.section() == 3) {
            self.statisticsAllowed(true);
        }
    };
    
    self.filteredRowCount = ko.observable();

    self.filterError = ko.observable();

    self.applyFilters = function () {
        var ids = [];
        $.each(self.filters(), function(i, filter) {
            if (filter.ShowFilterCompareValue1() && !filter.FilterValue1()) {
                ids.push(i + 1);
            } else if (filter.ShowFilterCompareNumeric() && !$.isNumeric(filter.FilterValue1())) {
                ids.push(i + 1);
            } else if (filter.ShowFilterCompareDatetime() && (!filter.FilterDateValue1() || !filter.FilterTimeValue1())) {
                ids.push(i + 1);
            }
        });

        if (ids.length == 1) {
            if (ids.length == self.filters().length) {
                self.filterError('Please enter a value for your filter');
            } else {
                self.filterError('Please enter a value for filter ' + ids[0]);
            }
        } else if (ids.length > 1) {
            self.filterError('Please enter a value for filters: ' + ids.join(', '));
        } else {
            self.filterError(null);
            self.refresh(0, function (success) {
                if (success) {
                    self.goToNextSection();
                }
            });
        }
    };


    self.statistics = ko.observable();

    self.addStatistic = function (settings) {
        if (self.statistics()) {
            self.statistics().AddStatistic();
        }
        if (!self.statistics()) {
            var statistics = new nodes.Summarize({ Name: "Statistics", Tool: statsTool });

            var input = null;
            if (self.filters().length > 0) {
                input = self.filters()[self.filters().length - 1];
            } else {
                input = self.select();
            }

            statistics.Inputs([input.Id]);
            statistics.OnInputsUpdated(self);

            if (settings) {
                // do not try to load input ids as we know what it will be
                settings.Inputs[0] = input.Id;
            }

            if (settings) {
                statistics.LoadSettings(settings, self);
            }

            statistics.rowCount = ko.observable();

            self.statistics(statistics);
        }
    };

    self.removeStatistics = function () {
        self.statistics(null);
    };

    self.applyStatistics = function() {
        self.refresh(0, function (success) {
            if (success) {
                self.goToNextSection();
            }
        });
    }
    
    self.changeDataSource = function () {
        self.loadJoinStructure();
    }


    self.loadJoinStructure = function (settings, callback) {
        self.dataTables.removeAll();
        self.joins.removeAll();
        self.filters.removeAll();
        self.filteredRowCount(null);
        self.statistics(null);

        var settingNode = settings;

        backend.GetJoins(self.dataTable().Table(), function (data) {

            self.dataTable().SetColumns(data.columns, data.columnTypes);
            
            var cols = [];
            $.each(data.columns, function (i, col) {
                var checked = data.showColumns[i];
                if (settingNode) {
                    checked = settingNode.selectedColumns.indexOf(col) >= 0;
                }
                cols.push({
                    name: ko.observable(col),
                    show: ko.observable(data.showColumns[i]),
                    checked: ko.observable(checked)
                });
            });

            self.dataTable().selectedColumns(cols);

            if (settingNode) {
                settingNode = settingNode.next;
            }
            
            var depthFirstSearch = function (joinStructure, curr, children) {
                $.each(joinStructure.parents, function (i, parent) {
                    var joinSettings = null;
                    if (settingNode && settingNode.Type == 'Join' && settingNode.dataSource && settingNode.dataSource.Table == parent.displayName) {
                        joinSettings = settingNode;
                    }

                    // add data table
                    var newJoinDataTable = new nodes.DatabaseTable({ Name: 'Join Table ' + joinSeed, Tool: databaseTableTool });

                    newJoinDataTable.Tables(self.dataTable().Tables());
                    newJoinDataTable.Table(parent.displayName);
                    newJoinDataTable.SetColumns(parent.columns, parent.columnTypes);


                    var cols = [];
                    $.each(parent.columns, function (i, col) {
                        var checked = false;
                        if (joinSettings) {
                            checked = joinSettings.dataSource.selectedColumns.indexOf(col) >= 0;
                        }
                        cols.push({
                            name: ko.observable(col),
                            show: ko.observable(parent.showColumns[i]),
                            checked: ko.observable(checked)
                        });
                    });

                    newJoinDataTable.selectedColumns = ko.observableArray(cols);


                    newJoinDataTable.selectedColumnCount = ko.pureComputed(function () {
                        return newJoinDataTable.selectedColumns().filter(function (col) { return col.checked() }).length;
                    }, newJoinDataTable);

                    newJoinDataTable.checked = ko.pureComputed({
                        read: function () {
                            return newJoinDataTable.selectedColumnCount() > 0;
                        },
                        write: function (value) {
                            $.each(newJoinDataTable.selectedColumns(), function (i, col) {
                                if (value) {
                                    col.checked(col.show());
                                } else {
                                    col.checked(false);
                                }
                            });
                        },
                        owner: newJoinDataTable
                    });
                    
                    self.dataTables.push(newJoinDataTable);

                    // add join
                    var newJoin = new nodes.Join({ Name: 'Join ' + joinSeed, Tool: joinTool });

                    newJoin.children = children;

                    var lastInput = null;
                    if (self.joins().length > 0) {
                        lastInput = self.joins()[self.joins().length - 1];
                    } else {
                        lastInput = self.dataTable();
                    }

                    newJoin.Inputs([lastInput.Id, newJoinDataTable.Id]);
                    newJoin.OnInputsUpdated(self);

                    newJoin.JoinType("LeftOuter"); // left join

                    newJoin.Table1Column(parent.childJoinColumn);
                    newJoin.Table2Column(parent.parentJoinColumn);

                    newJoin.CalculateColumns();

                    self.joins.push(newJoin);

                    joinSeed += 1;

                    if (joinSettings) {
                        settingNode = joinSettings.next;
                    }

                    depthFirstSearch(parent, newJoin, children.concat([newJoin.Id]));
                });
            };

            depthFirstSearch(data, self.dataTable(), [self.dataTable().Id]);

            var lastInput = null;
            if (self.joins().length > 0) {
                lastInput = self.joins()[self.joins().length - 1];
            } else {
                lastInput = self.dataTable();
            }

            self.select().Inputs([lastInput.Id]);
            self.select().OnInputsUpdated(self);

            var includedIndexes = [];
            var index = 0;

            if (self.dataTable().selectedColumns().some(function (item) { return item.checked(); })) {
                $.each(self.dataTable().selectedColumns(), function (j, column) {
                    if (column.checked()) {
                        includedIndexes.push(index);
                    }
                    index++;
                });
            }

            $.each(self.dataTables(), function (i, table) {
                $.each(table.selectedColumns(), function (j, column) {
                    if (column.checked()) {
                        includedIndexes.push(index);
                    }
                    index++;
                });
            });

            self.select().IncludedColumnIndexes(includedIndexes);
            self.select().CalculateColumns();

            $.each(self.filters(), function (j, filter) {
                filter.SetColumns(self.select().Columns(), self.select().ColumnTypes());
            });

            if (callback) {
                callback();
            } else {
                self.refresh(0);
            }
        })
    };

    self.getSaveSettings = function () {
        var data = {
            Nodes: []
        }

        var joinIds = [];
        $.each(self.joins(), function (i, joinNode) {
            if (joinNode.InputRefs()) {
                var tableNode = joinNode.InputRefs()[1];
                if (tableNode.selectedColumnCount() > 0) {
                    if ($.inArray(joinNode.Id, joinIds) < 0) {
                        joinIds.push(joinNode.Id);
                    }
                    $.each(joinNode.children, function (j, nodeId) {
                        if ($.inArray(nodeId, joinIds) < 0) {
                            joinIds.push(nodeId);
                        }
                    })
                }
            }
        })

        var includedIndexes = [];
        var index = 0;

        $.each(self.dataTable().selectedColumns(), function (j, column) {
            if (column.checked()) {
                includedIndexes.push(index);
            }
            index++;
        });

        $.each(self.joins(), function (i, joinNode) {
            if ($.inArray(joinNode.Id, joinIds) >= 0 && joinNode.InputRefs()) {
                var tableNode = joinNode.InputRefs()[1];

                $.each(tableNode.selectedColumns(), function (j, column) {
                    if (column.checked()) {
                        includedIndexes.push(index);
                    }
                    index++;
                });
            }
        })

        var populateNodeSettings = function (curr, top, left) {
            var settings = curr.GetSaveSettings();

            if (curr.Tool.Name == "Select") {
                settings.IncludedColumnIndexes = includedIndexes;
            }

            settings.Top = top;
            settings.Left = left;

            data.Nodes.unshift(settings);
            if (curr.Tool.Name != "Data Table") {
                // rebuild columns to account for joins that have been removed
                if (curr.Tool.Name != "Join") {
                    settings.Columns = [];
                    settings.ColumnTypes = [];
                }

                $.each(curr.InputRefs().slice(0).reverse(), function (i, inputNode) {
                    // if this child is a join to a table with no columns selected we need to ignore it.
                    var next = inputNode;
                    var canIgnore = function (node) {
                        if (node.Tool.Name == "Join") {
                            return $.inArray(node.Id, joinIds) < 0;
                        } else {
                            return false;
                        }
                    };

                    while (canIgnore(next)) {
                        next = next.InputRefs()[0];
                    }
                    settings.Inputs[settings.Inputs.length - 1 - i] = next.Id;

                    var parentSettings;
                    if (curr.Tool.Name == "Join" && i == 0) {
                        parentSettings = populateNodeSettings(next, top + 45, left - 120);
                    } else {
                        parentSettings = populateNodeSettings(next, top - 45, left - 120);
                    }

                    // rebuild columns to account for joins that have been removed
                    if (curr.Tool.Name != "Join") {
                        settings.Columns = settings.Columns.concat(parentSettings.Columns);
                        settings.ColumnTypes = settings.ColumnTypes.concat(parentSettings.ColumnTypes);
                    }
                });
            }
            else
            {
                settings.selectedColumns = curr.selectedColumns()
                    .filter(function (item) { return item.checked(); })
                    .map(function (item) { return item.name(); });
            }

            return settings;
        }

        if (self.selectedNode() != null) {
            populateNodeSettings(self.selectedNode(), 0, 0);

            var dataTableNode = data.Nodes.filter(function (node) { return node.Id == self.dataTable().Id; })[0];

            var topOffset = 30 - dataTableNode.Top,
                leftOffset = 30 - dataTableNode.Left;

            $.each(data.Nodes, function(i, node) {
                node.Top += topOffset;
                node.Left += leftOffset;
            });

            if (self.HasChart()) {
                data.Nodes.push({
                    "Type": self.GraphType(),
                    "Id": self.ChartGuid(),
                    "Inputs": [self.selectedNode().Id],
                    "HorizontalAxis": self.selectedNode().Columns()[self.XAxis()],
                    "DataSeriesColumnIndexes": [self.YAxis()],
                    "Name": "Line Chart 1",
                    "Top": 500,
                    "Left": 500,
                    "Columns": [],
                    "ColumnTypes": []
                });
                data.SelectedNodeId = self.ChartGuid();
            } else {
                data.SelectedNodeId = self.selectedNode().Id;
            }

        }

        return data;
    }

    self.exportUrl = ko.pureComputed(function () {
        if (self.serverQueryKey()) {
            return backend.baseUri + "/api/cache/" + self.serverQueryKey() + "/" + self.selectedNode().Id + "/export/";
        } else {
            return null;
        }
    });


    var refreshNode = function (start, node, rowCount, success, failure) {
        var nodeSettings = [];

        var joinIds = [];
        $.each(self.joins(), function (i, joinNode) {
            if (joinNode.InputRefs()) {
                var tableNode = joinNode.InputRefs()[1];
                if (tableNode.selectedColumnCount() > 0) {
                    if ($.inArray(joinNode.Id, joinIds) < 0) {
                        joinIds.push(joinNode.Id);
                    }
                    $.each(joinNode.children, function (j, nodeId) {
                        if ($.inArray(nodeId, joinIds) < 0) {
                            joinIds.push(nodeId);
                        }
                    })
                }
            }
        })

        var includedIndexes = [];
        var index = 0;

        $.each(self.dataTable().selectedColumns(), function (j, column) {
            if (column.checked()) {
                includedIndexes.push(index);
            }
            index++;
        });

        $.each(self.joins(), function (i, joinNode) {
            if ($.inArray(joinNode.Id, joinIds) >= 0 && joinNode.InputRefs()) {
                var tableNode = joinNode.InputRefs()[1];

                $.each(tableNode.selectedColumns(), function (j, column) {
                    if (column.checked()) {
                        includedIndexes.push(index);
                    }
                    index++;
                });
            }
        })

        var populateNodeSettings = function (curr) {
            var settings = curr.GetCoreSettings();

            if (curr.Tool.Name == "Select") {
                settings.IncludedColumnIndexes = includedIndexes;
            }

            nodeSettings.push(settings);
            if (typeof curr.InputRefs === "function") {
                $.each(curr.InputRefs().slice(0).reverse(), function (i, inputNode) {
                    // if this child is a join to a table with no columns selected we need to ignore it.
                    var next = inputNode;
                    var canIgnore = function (node) {
                        if (node.Tool.Name == "Join") {
                            return $.inArray(node.Id, joinIds) < 0;
                        } else {
                            return false;
                        }
                    };

                    while (canIgnore(next)) {
                        next = next.InputRefs()[0];
                    }
                    settings.Inputs[settings.Inputs.length - 1 - i] = next.Id;
                    populateNodeSettings(next);
                });
            }
        }

        populateNodeSettings(node);
        
        backend.SaveQuery(self.serverQueryKey, nodeSettings, function () {
            fetchStart = start;
            fetchCount = self.dataPageSize();
            
            // If a chart is being shown, fetch all the data
            if (self.HasChart()) {
                fetchStart = null;
                fetchCount = null;
            }

            backend.LoadData(self.serverQueryKey, nodeSettings, node.Id, fetchStart, fetchCount, "JSON", null, function (data) {
                if (data.status) {

                    node.SetColumns(data.columns, data.columnTypes);

                    if (data.status === "ok" || data.status === "no_data") {
                        if (rowCount) {
                            rowCount(data.rowCount);
                        }

                        if (node.Id == self.selectedNode().Id) {
                            self.currentDataColumns(data.columns);
                            self.currentDataFull(data.rows);
                            self.currentRowStart(start + 1);
                            self.currentRowsTotal(data.rowCount);

                            var headerCategories = self.dataTables()
                                .filter(function (item) { return item.selectedColumnCount() > 0; })
                                .map(function (item) {
                                    return {
                                        name: item.Table(),
                                        columnCount: item.selectedColumnCount()
                                    };
                                });

                            if (!self.statistics() && headerCategories.length > 0) {
                                if (self.dataTable().selectedColumnCount() > 0) {
                                    headerCategories.unshift({
                                        name: self.dataTable().Table(),
                                        columnCount: self.dataTable().selectedColumnCount()
                                    });
                                }

                                self.headerCategories(headerCategories);
                            }
                        }


                        if (success) {
                            success();
                        }
                    } else {
                        if (rowCount) {
                            rowCount(null);
                        }
                        node.ErrorText("Something went wrong while trying to fetch the data. Please contact an administrator.");

                        if (failure) {
                            failure();
                        }
                    }
                } else if (failure) {
                    failure();
                }
            });
        });
    };

    self.loading = ko.observable(false);

    self.headerCategories = ko.observableArray();

    self.refresh = function (start, callback) {

        if (self.filters().length == 0) {
            self.filteredRowCount(null);
        }

        self.loading(true);
        self.currentDataColumns([]);
        self.currentDataFull([]);
        self.currentRowStart(0);
        self.currentRowsTotal(0);

        self.headerCategories([]);

        var finish = function (success) {
            self.loading(false);

            if (self.HasChart()) {
                self.RenderChart(self.GraphType(), self.XAxis(), self.YAxis());
            }

            if (callback) {
                callback(success);
            }
        };

        var refreshDataTable = function () {
            refreshNode(start, self.select(), self.dataTable().rowCount, function () {
                refreshFilters();
            }, function () {
                finish(false)
            });
        };
        
        var refreshFilters = function () {
            if (self.filters().length > 0) {
                refreshNode(start, self.filters()[self.filters().length - 1], self.filteredRowCount, refreshStatistics, function () {
                    finish(false)
                });
            } else {
                refreshStatistics();
            }
        };
        
        var refreshStatistics = function () {
            if (self.statistics()) {
                refreshNode(start, self.statistics(), self.statistics().rowCount, function () {
                    finish(true);
                }, function () {
                    finish(false)
                });
            } else {
                finish(true);
            }
        };

        refreshDataTable();
    };

    self.selectedNode = ko.computed(function () {
        if (self.statistics()) {
            return self.statistics();
        } else if (self.filters().length > 0) {
            return self.filters()[self.filters().length - 1];
        } else {
            return self.select();
        }
    }, self);

    self.AllColumns = ko.pureComputed(function () {
        var results = [];

        if (self.selectedNode() != null) {

            self.selectedNode().ColumnTypes().forEach(function (columnType, i) {
                results.push({ Index: i, Name: self.selectedNode().Columns()[i] });
            });
        }

        return results;
    });


    self.NumericColumns = ko.pureComputed(function () {
        var results = [];

        if (self.selectedNode() != null) {
            
            self.selectedNode().ColumnTypes().forEach(function (columnType, i) {
                if (tools.IsNumericType(columnType)) {
                    results.push({ Index: i, Name: self.selectedNode().Columns()[i] });
                }
            });
        }

        return results;
    });

    self.NumericAndDateColumns = ko.pureComputed(function () {
        var results = [];

        if (self.selectedNode() != null) {

            self.selectedNode().ColumnTypes().forEach(function (columnType, i) {
                if (tools.IsNumericType(columnType) || tools.IsDatetimeType(columnType)) {
                    results.push({ Index: i, Name: self.selectedNode().Columns()[i] });
                }
            });
        }

        return results;
    });

    self.GraphTypes = ko.pureComputed(function () {
        var results = [];

        if (self.AllColumns().length >= 2 && self.NumericColumns().length > 0) {
            results.push("Bar Chart");

            if (self.NumericAndDateColumns().length >= 2) {
                results.push("Line Chart");
            }
            results.push("Pie Chart");
        }

        return results;
    });

    self.GraphType = ko.observable();

    self.HorizontalAxisLabel = ko.pureComputed(function () {
        switch (self.GraphType()) {
            case "Bar Chart":
                return "Category";
            case "Line Chart":
                return "Horizontal Axis";
            case "Pie Chart":
                return "Category";
            default:
                return "";
        }
    });

    self.HorizontalAxisOptions = ko.pureComputed(function () {
        switch (self.GraphType()) {
            case "Bar Chart":
                return self.AllColumns();
            case "Line Chart":
                return self.NumericAndDateColumns();
            case "Pie Chart":
                return self.AllColumns();
            default:
                return [];
        }
    });

    self.VerticalAxisLabel = ko.pureComputed(function () {
        switch (self.GraphType()) {
            case "Bar Chart":
                return "Value";
            case "Line Chart":
                return "Vertical Axis";
            case "Pie Chart":
                return "Value";
            default:
                return "";
        }
    });

    self.VerticalAxisOptions = ko.pureComputed(function () {
        switch (self.GraphType()) {
            case "Bar Chart":
            case "Line Chart":
            case "Pie Chart":
                return self.NumericColumns();
            default:
                return [];
        }
    });

    self.XAxis = ko.observable();
    self.YAxis = ko.observable();

    self.formatColumn = function (index, data) {
        var column_type = null;

        if (self.selectedNode() != null) {
            column_type = self.selectedNode().ColumnTypes()[index];
        }

        switch (column_type) {
            case 'datetime':
                return moment(new Date(data)).format('lll');
            case 'date':
                return moment(new Date(data)).format('ll');
            default:
                return data;
        }
    }

    var popFirst = function (arr, pred) {
        for (var i = arr.length; i--;) {
            if (pred(arr[i])) {
                var result = arr[i];

                arr.splice(i, 1);

                return result;
            }
        }
        return null;
    }



    self.load = function (data) {

        var nodes = data.Nodes.slice();

        // build settings tree.
        var settingTree = popFirst(nodes, function (item) { return item.Name == "Data Source"; });
        var curr = settingTree;

        if (curr) {
            curr.next = popFirst(nodes, function (item) { return item.Type != 'Data Table' && item.Inputs.indexOf(curr.Id) >= 0; });
            while (curr.next) {

                if (curr.Type == 'Join') {
                    curr.dataSource = popFirst(nodes, function (item) { return item.Id == curr.Inputs[1]; })
                }

                curr = curr.next;
                curr.next = popFirst(nodes, function (item) { return item.Type != 'Data Table' && item.Inputs.indexOf(curr.Id) >= 0; });
            }

            self.dataTable().LoadSettings(settingTree);

            self.loadJoinStructure(settingTree, function () {

                while (settingTree) {
                    if (settingTree.Type == 'Filter') {
                        self.addFilter(settingTree);
                    }
                    if (settingTree.Type == 'Summarize') {
                        self.addStatistic(settingTree);
                    }
                    if ($.inArray(settingTree.Type, ['Line Chart', 'Bar Chart', 'Pie Chart']) >= 0) {
                        self.ChartGuid(settingTree.Id)
                        self.HasChart(true);
                        self.GraphType(settingTree.Type);
                        self.XAxis($.inArray(settingTree.HorizontalAxis, self.selectedNode().Columns()));
                        self.YAxis(settingTree.DataSeriesColumnIndexes[0]);
                    }
                    settingTree = settingTree.next;
                }

                self.filtersAllowed(true);
                self.statisticsAllowed(true);

                self.section(4);

                self.refresh(0);
            });

        }
    }

    self.RenderChart = function (graphType, xAxis, yAxis) {
        if (self.HasChart() && self.currentDataFull() && self.currentDataFull().length > 0) {
            var columnTypes = self.selectedNode().ColumnTypes();
            utils.RenderChart('#chart', self.currentDataFull(), graphType, xAxis, columnTypes[xAxis], yAxis, columnTypes[yAxis]);
        } else {
            $('#chart').empty();
        }
    };

    self.GraphType.subscribe(function (newVal) {
        self.RenderChart(newVal, self.XAxis(), self.YAxis());
    });

    self.XAxis.subscribe(function (newVal) {
        self.RenderChart(self.GraphType(), newVal, self.YAxis());
    });
    self.YAxis.subscribe(function (newVal) {
        self.RenderChart(self.GraphType(), self.XAxis(), newVal);
    });

    self.ChartGuid = ko.observable();

    self.ShowChart = function () {
        self.ChartGuid(utils.CreateGuid());
        self.HasChart(true);
        self.refresh(self.currentRowStart() - 1, function() {
            self.RenderChart(self.GraphType(), self.XAxis(), self.YAxis());
        });
    }

    self.HideChart = function () {
        // save the current page of data, as removing the chart will change how the paging works
        var data = self.currentData().slice(0);
        self.HasChart(false);
        self.currentDataFull(data);
        self.RenderChart(self.GraphType(), self.XAxis(), self.YAxis());
    }

    return self;
};
