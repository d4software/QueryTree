// 'nodes' Module
//
// Defines a number of classes that can be used to create nodes on the workspace
//
// Depends on: knockout.js, utils.js, backend.js

var getTransmitterPoint;
var getReceiverPoint;
var theChart = null;

getTransmitterPoint = function (node) {
    var point = { };
    point.x = node.Left() + 60; // (48 + 12), 12 pixels left of the source node's right edge
    point.y = node.Top() + 24; // (48 / 2), half way down the source node
    return point;
};

getReceiverPoint = function (node) {
    var point = { };
    point.x = node.Left() - 12; // 12 pixels left of this node's left edge
    point.y = node.Top() + 24; // (48 / 2), half way down the destination node
    return point;
};

nodes = {};

// Base class for all Workspace Nodes
nodes.NodeBase = function(properties) {
    var instance = {};
            
    // The name to display beneath this node's icon
    instance.Name = ko.observable(properties.Name);

    if (properties.Tool) {
        // A reference to this node's tool type
        instance.Tool = properties.Tool;

        // The path of the icon for this node
        instance.SymbolPath = properties.Tool.SymbolPath;
    }

    // The location of this node's options UI template
    instance.OptionsTemplateUrl = properties.OptionsTemplateUrl;

    // The location of this node
    instance.Top = ko.observable(properties.Top);
    instance.Left = ko.observable(properties.Left);

    // Is this node currently selected
    instance.IsSelected = ko.observable(false);

    // An array of this node's columns
    instance.ColumnItems = ko.observableArray();

    instance.SetColumns = function (column_names, column_types) {
        var cols = [];
        if (column_names && column_types && column_names.length == column_types.length) {
            for (var i = 0; i < column_names.length; i++) {
                cols.push({ column_name: column_names[i], column_type: column_types[i] });
            }
        }
        instance.ColumnItems(cols);
    }

    instance.ColumnTypes = ko.computed(function () {
        var items = instance.ColumnItems();

        if (items === undefined) {
            return [];
        } else {
            return items.map(function (col) { return col.column_type; });
        }
    });

    instance.Columns = ko.computed(function () {
        var items = instance.ColumnItems();

        if (items === undefined) {
            return [];
        } else {
            return items.map(function (col) { return col.column_name; });
        }

    });

    // A unique ID for this Node
    instance.Id = properties.Id;
    if (instance.Id == undefined) {
        instance.Id = utils.CreateGuid();
    }

    instance.ErrorText = ko.observable(null);

    // All nodes get notified when selected so they can render their results
    instance.OnSelected = function(models) {
    }

    // All nodes get notified when the options window is closed
    instance.OnOptionsUpdated = function() {
    }

	// All nodes have the opportunity to override this and say whether they are configured or not
    instance.IsConfigured = function () {
        return true;
    }

    // default base instace of a function to get the core settings
    // which the qt.exe process needs. Nodes may override this 
    // function to pass more settings to qt.exe
    instance.GetCoreSettings = function() {
        var settings = {
            "Type": instance.Tool.Name,
            "Id": instance.Id
        }

        return settings;
                    
    }

    // default base instance of a function by which the system
    // will get the properties from a node that need to be
    // saved. Nodes may override this function to persist more
    // of their settings
    instance.GetSaveSettings = function() {
        var settings = instance.GetCoreSettings();
                
        settings["Name"] = instance.Name();
        settings["Top"] = instance.Top();
        settings["Left"] = instance.Left();

        if (instance.Columns()) {
            settings["Columns"] = instance.Columns();
        }

        if (instance.ColumnTypes()) {
            settings["ColumnTypes"] = instance.ColumnTypes();
        }

        return settings;
    }
            
    instance.LoadSettings = function(settings, model) {
        instance.Name(settings.Name);
        instance.Id = settings.Id;
        instance.Top(settings.Top);
        instance.Left(settings.Left);
        instance.SetColumns(settings.Columns, settings.ColumnTypes);
    }

    instance.GetRightExtent = function() {
        if (instance.GetTransmitterPoint) {
            var p = instance.GetTransmitterPoint();
            return p.x + 16;
        }
        else {
            return instance.Left() + 64;
        }
    }

    instance.GetBottomExtent = function() {
        return instance.Top() + 80;
    }

    return instance;
};

// Base class for all Data Source type Workspace Nodes
nodes.DataSourceBase = function(properties) {
    var instance = new nodes.NodeBase(properties);
    instance.Type = 'DataSource';

    // This node's current data set
    instance.Data = ko.observableArray();
    instance.TotalPages = ko.computed(function() {
        return Math.floor(instance.Data().length / 10.0) + 1;
    });

    instance.CurrentPage = ko.observable(1);

    instance.CurrentPageData = ko.computed(function() {
        return instance.Data.slice((instance.CurrentPage() - 1) * 10, Math.min(((instance.CurrentPage() - 1) * 10) + 9, instance.Data().length - 1));
    });

    instance.GetTransmitterPoint = function() {
        return getTransmitterPoint(this);
    };

    var innerLoadSettings = instance.LoadSettings;
    instance.LoadSettings = function (settings, model) {
        innerLoadSettings(settings, model);
    };

    return instance;
};

nodes.DatabaseTable = function(properties) {
    var instance = new nodes.DataSourceBase(properties);
    instance.Tables = ko.observableArray();
    instance.Table = ko.observable();
    instance.TablesLoading = ko.observable(false);
    
    instance.Table.subscribe(function (val) {
        if (/Data Table [0-9]+/.test(instance.Name()) || $.inArray(instance.Name(), instance.Tables()) >=  0) {
            instance.Name(val);
        }
    });

    instance.loadTables = function (callback) {
        if (instance.Tables().length == 0) {
            instance.TablesLoading(true);
            backend.LoadTables(function(data) {
                if (data.status == null) {
                    instance.Tables(data);
                    instance.TablesLoading(false);
                }

                if (callback) {
                    callback();
                }
            });
        }
    };

    var innerGetCoreSettings = instance.GetCoreSettings;
    instance.GetCoreSettings = function() {
        var settings = innerGetCoreSettings();
        settings.Table = instance.Table();
        return settings;                
    }
            
    var innerGetSaveSettings = instance.GetSaveSettings;
    instance.GetSaveSettings = function() {
        var settings = innerGetSaveSettings();
        settings.Tables = instance.Tables();
        return settings;
    };

    var innerLoadSettings = instance.LoadSettings;
    instance.LoadSettings = function(settings, model) {
        innerLoadSettings(settings, model);
        instance.Tables(settings.Tables);
        instance.Table(settings.Table);
    };

    instance.IsConfigured = function () {
        return instance.Tables().length > 0;
    }

    instance.OnSelected = function(models) {
        // Load the tables if they are empty
        instance.loadTables();
    }

    instance.RefreshTables = function() { 
        instance.Tables.removeAll();
        instance.loadTables();
    }

    return instance;
};

// Base class for all Data Processing type Workspace Nodes
nodes.DataProcessorBase = function(properties) {
    var instance = new nodes.NodeBase(properties);
    instance.Type = 'DataProcessor';

    // This node's current data set
    instance.Data = ko.observableArray();
    instance.TotalPages = ko.computed(function() {
        return Math.floor(instance.Data().length / 10.0) + 1;
    });
    instance.CurrentPage = ko.observable(1);

    instance.CurrentPageData = ko.computed(function() {
        return instance.Data.slice((instance.CurrentPage() - 1) * 10, Math.min(((instance.CurrentPage() - 1) * 10) + 9, instance.Data().length));
    });

    // Indicates whether this node will accpet new input connections
    instance.IsInputAllowed = ko.observable(true);

    // An array of ids to this node's input nodes
    instance.Inputs = ko.observableArray();

    // A standard way of storing references to this node's inputs
    instance.InputRefs = ko.observableArray();

    // An event handler that is called when a new input is connected
    instance.OnInputsUpdated = function(model) {
        // Update the InputRefs map
        instance.InputRefs.removeAll();
        $.each(instance.Inputs(), function(i, inputId) {
            var inputRef = model.GetNodeById(inputId);
            if (inputRef != null) {
                instance.InputRefs.push(inputRef);
            }
        });
        instance.IsInputAllowed(instance.Inputs().length < instance.Tool.MaxInputs)
        if (instance.Inputs().length == 0) {
            instance.ColumnItems.removeAll();
            instance.Data.removeAll();
        }
    };

    // Helper function to get all the column names from all the inputs
    instance.AllInputColumns = ko.computed(function() {
        var result = [];
        $.each(instance.InputRefs(), function(i, inputRef) {
            if (inputRef.Columns() != undefined) {
                $.each(inputRef.Columns(), function(j, col) {
                    result.push(col);
                });
            }
        });
        return result;
    });

    // Helper function to get all the column names from all the inputs
    instance.NumericInputColumns = ko.computed(function () {
        var result = [];
        $.each(instance.InputRefs(), function (i, inputRef) {
            if (inputRef.ColumnItems() != undefined) {
                var columns = inputRef.ColumnItems();
                for (var i = 0; i < columns.length; i++) {
                    if (tools.IsNumericType(columns[i].column_type)) {
                        result.push(columns[i].column_name);
                    }
                }
            }
        });
        return result;
    });

    // Helper function to get all the column names from all the inputs
    instance.NumericOrDatetimeInputColumns = ko.computed(function () {
        var result = [];
        $.each(instance.InputRefs(), function (i, inputRef) {
            if (inputRef.ColumnItems() != undefined) {
                var columns = inputRef.ColumnItems();
                for (var i = 0; i < columns.length; i++) {
                    if (tools.IsNumericType(columns[i].column_type) || tools.IsDatetimeType(columns[i].column_type)) {
                        result.push(columns[i].column_name);
                    }
                }
            }
        });
        return result;
    });

    // Helper function to get info of all the columns from all the inputs
    instance.AllInputColumnInfos = ko.computed(function() {
        var result = [];
        $.each(instance.InputRefs(), function(i, inputRef) {
            if (inputRef.ColumnItems() != undefined) {
                $.each(inputRef.ColumnItems(), function (j, col) {
                    result.push({ InputId: inputRef.Id, Index: j, Name: col.column_name, Type: col.column_type });
                });
            }
        });
        return result;
    })

    // Helper function to get info of all the columns from all the inputs
    instance.NumericInputColumnInfos = ko.computed(function () {
        var result = [];
        $.each(instance.InputRefs(), function (i, inputRef) {
            if (inputRef.ColumnItems() != undefined) {
                $.each(inputRef.ColumnItems(), function (j, col) {
                    if (tools.IsNumericType(col.column_type)) {
                        result.push({ InputId: inputRef.Id, Index: j, Name: col.column_name, Type: col.column_type });
                    }
                });
            }
        });
        return result;
    })

    // Helper function to get the columns from a specified input
    instance.GetInputColumns = function(i) {
        if (instance.InputRefs().length > i) {
            return instance.InputRefs()[i].Columns();
        }
        else {
            return [];
        }
    }

    // Helper function to get the name of a specified input
    instance.GetInputName = function(i) {
        if (instance.InputRefs().length > i) {
            return instance.InputRefs()[i].Name();
        }
        else {
            return "";
        }
    }

    var innerGetCoreSettings = instance.GetCoreSettings;
    instance.GetCoreSettings = function () {
        var settings = innerGetCoreSettings();
        settings.Inputs = instance.Inputs();
        return settings;
    }

    var innerLoadSettings = instance.LoadSettings;
    instance.LoadSettings = function(settings, model) {
        innerLoadSettings(settings, model);
        instance.Inputs(settings.Inputs);
        instance.OnInputsUpdated(model);
    }

    instance.GetTransmitterPoint = function() {
        return getTransmitterPoint(this);
    }

    instance.GetReceiverPoint = function() {
        return getReceiverPoint(this);
    }

    return instance;
};

nodes.Join = function(properties) {
    var instance = new nodes.DataProcessorBase(properties);

    instance.JoinType = ko.observable();
    instance.Table1Column = ko.observable();
    instance.Table2Column = ko.observable();

    instance.Table1Columns = ko.computed(function() {
        return instance.GetInputColumns(0);
    });

    instance.Table2Columns = ko.computed(function() {
        return instance.GetInputColumns(1);
    });
            
    instance.Table1Name = ko.computed(function() {
        return instance.GetInputName(0);
    });
            
    instance.Table2Name = ko.computed(function() {
        return instance.GetInputName(1);
    });

    var innerGetCoreSettings = instance.GetCoreSettings;
    instance.GetCoreSettings = function() {
        var settings = innerGetCoreSettings();
        settings.JoinType = instance.JoinType();
        settings.Table1Column = instance.Table1Column();
        settings.Table2Column = instance.Table2Column();
        return settings;
    };

    var innerLoadSettings = instance.LoadSettings;
    instance.LoadSettings = function(settings, model) {
        innerLoadSettings(settings, model);
        instance.JoinType(settings.JoinType);
        instance.Table1Column(settings.Table1Column);
        instance.Table2Column(settings.Table2Column);
    };

    instance.OnOptionsUpdated = function(model) {
    }

    instance.CalculateColumns = function () {
        var columnInfos = instance.AllInputColumnInfos(),
            columnNames = columnInfos.map(function (col) { return col.Name; }),
            columnTypes = columnInfos.map(function (col) { return col.Type; });

        instance.SetColumns(columnNames, columnTypes)
    }

    return instance;
};
        
nodes.Select = function(properties) {
    var instance = new nodes.DataProcessorBase(properties);
    instance.IncludedColumnIndexes = ko.observableArray();
    instance.ColumnAliases = ko.observableArray();
    instance.EditingPosition = ko.observable(null);
    instance.EditColumnName = ko.observable();

    var innerGetCoreSettings = instance.GetCoreSettings;
    instance.GetCoreSettings = function() {
        var settings = innerGetCoreSettings();
        settings.IncludedColumnIndexes = instance.IncludedColumnIndexes();
        settings.ColumnAliases = instance.ColumnAliases();
        return settings;
    }

    var innerLoadSettings = instance.LoadSettings;
    instance.LoadSettings = function(settings, model) {
        innerLoadSettings(settings, model);
        instance.IncludedColumnIndexes(settings.IncludedColumnIndexes || []);
        instance.ColumnAliases(settings.ColumnAliases || []);
    }

    instance.GetColumnName = function(i) {
        if (instance.IncludedColumnIndexes().length > i() && instance.IncludedColumnIndexes()[i()] != null) {
            var j = instance.IncludedColumnIndexes()[i()];
            var name = instance.AllInputColumns()[j];

            if (instance.ColumnAliases().length > i() && instance.ColumnAliases()[i()] != null) {
                name = instance.ColumnAliases()[i()];
            }
            
            return name;
        }
        else {
            return "";
        }
    }

    instance.EnableEditMode = function (item, event) {
        // Cunning plan to force you to finish editing one item before editing the next item - causes all kinds of problems
        if (instance.EditingPosition() == null) {
            var i = $(event.target).parent().prevAll().length;
            instance.EditColumnName($(event.target).parent().find("span").text());
            instance.EditingPosition(i);
        }
        event.cancelBubble = true;
        return false;
    }

    instance.FinishedEditMode = function (item, event) {
        if (instance.EditingPosition() != null) {
            instance.ColumnAliases()[instance.EditingPosition()] = instance.EditColumnName();
            instance.EditingPosition(null);
            instance.EditColumnName(null);
            var i = $(event.target).parent().prevAll().length;
            $(event.target).parent().find("span").text(instance.ColumnAliases()[i]);
        }
        event.cancelBubble = true;
        return false;
    }

    instance.RemoveAll = function() {
        instance.IncludedColumnIndexes.removeAll();
        instance.ColumnAliases.removeAll();
    }

    instance.AddAll = function() {
        instance.IncludedColumnIndexes.removeAll();
        $.each(instance.AllInputColumnInfos(), function(i, info) {
            instance.IncludedColumnIndexes.push(info.Index);
        });
    }

    instance.RemoveItem = function(item, event) {
        var i = $(event.target).parent().prevAll().length;
        instance.IncludedColumnIndexes.splice(i, 1);
        if (instance.ColumnAliases().length > i) {
            instance.ColumnAliases.splice(i, 1);
        }
    }

    instance.IsEditing = function (i) {
        return instance.EditingPosition() === i();
    }

    instance.MoveAlias = function (i, j) {
        if (instance.EditingPosition() != null) {
            instance.EditingPosition(null);
            instance.EditColumnName(null);
        }
        instance.ColumnAliases().move(i, j);
    }

    instance.AddItem = function (i, val) {
        if (instance.ColumnAliases().length > i) {
            instance.ColumnAliases().splice(i, 0, null);
        }
    }

    instance.CalculateColumns = function () {
        var columnInfos = instance.IncludedColumnIndexes().map(function (i) { return instance.AllInputColumnInfos()[i]; }),
            columnNames = columnInfos.map(function (col) { return col.Name; }),
            columnTypes = columnInfos.map(function (col) { return col.Type; });

        instance.SetColumns(columnNames, columnTypes)
    }

    return instance;
}

nodes.Filter = function(properties) {
    var instance = new nodes.DataProcessorBase(properties);
    instance.FilterColumnIndex = ko.observable();
    instance.Operator = ko.observable();
    instance.FilterCompareColumnIndex = ko.observable(null);
    instance.FilterValue1 = ko.observable();
    instance.FilterBoolValue1 = ko.observable();
    instance.FilterDateValue1 = ko.observable(new Date());
    instance.FilterTimeValue1 = ko.observable("00:00");
    instance.CaseSensitive = ko.observable();
            
    var innerGetCoreSettings = instance.GetCoreSettings;
    instance.GetCoreSettings = function() {
        var settings = innerGetCoreSettings();
        settings.FilterColumnIndex = instance.FilterColumnIndex();
        settings.Operator = instance.Operator();
        if (instance.FilterCompareColumnIndex()) {
            settings.FilterCompareColumnIndex = instance.FilterCompareColumnIndex();
        }
        if (instance.FilterCompareValueIsBool()) {
            settings.FilterValue1 = instance.FilterBoolValue1();
        }
        else if (instance.FilterCompareValueIsDatetime()) {
            settings.FilterValue1 = utils.FormatDateTime(
                    instance.FilterDateValue1(),
                    instance.FilterTimeValue1());
        }
        else {
            settings.FilterValue1 = instance.FilterValue1();
        }
        settings.CaseSensitive = instance.CaseSensitive();
        return settings;
    }

    var innerLoadSettings = instance.LoadSettings;
    instance.LoadSettings = function(settings, model) {
        innerLoadSettings(settings, model);
        instance.FilterColumnIndex(settings.FilterColumnIndex);
        instance.Operator(settings.Operator);
        instance.FilterCompareColumnIndex(settings.FilterCompareColumnIndex);
        if (instance.FilterColumnIsBool()) {
            instance.FilterBoolValue1(settings.FilterValue1);
        }
        else if (instance.FilterColumnIsDatetime()) {
            var dt = new Date(Date.parse(settings.FilterValue1))
            instance.FilterDateValue1(dt);
            instance.FilterTimeValue1(moment(dt).format("HH:mm"));
        }
        else {
            instance.FilterValue1(settings.FilterValue1);
        }
        instance.CaseSensitive(settings.CaseSensitive);
    }
           
    instance.FilterColumnIsText = ko.computed(function() {
        var colInfo = instance.AllInputColumnInfos()[instance.FilterColumnIndex()];
        if (colInfo != null && tools.IsTextType(colInfo.Type)) {
            return true;
        } else {
            return false;
        }
    });

    instance.FilterColumnIsBool = ko.computed(function() {
        var colInfo = instance.AllInputColumnInfos()[instance.FilterColumnIndex()];
        if (colInfo != null && colInfo.Type != null) {
            switch (colInfo.Type.toUpperCase())
            {
                case "BIT":
                case "BOOL":
                case "BOOLEAN":
                    return true;
                default:
                    return false;
            }
        }
        else {
            return false;
        }
    });

    instance.FilterColumnIsDatetime = ko.computed(function() {
        var colInfo = instance.AllInputColumnInfos()[instance.FilterColumnIndex()];
        if (colInfo != null && tools.IsDatetimeType(colInfo.Type)) {
            return true;
        }
        else {
            return false;
        }
    });

    instance.FilterColumnIsNumeric = ko.computed(function() {
        var colInfo = instance.AllInputColumnInfos()[instance.FilterColumnIndex()];
        if (colInfo != null && tools.IsNumericType(colInfo.Type)) {
            return true;
        }
        else {
            return false;
        }
    });
            
    instance.ValidOperators = ko.computed(function() {
        var results = [];
        $.each(instance.Tool.Operators(), function(i, o) {
            if ((instance.FilterColumnIsNumeric() && o.number) ||
                (instance.FilterColumnIsText() && o.text) ||
                (instance.FilterColumnIsDatetime() && o.date) ||
                (instance.FilterColumnIsBool() && o.bool)) {
                    results.push(o);
            }
        });
        return results;
    });

    instance.ShowFilterCompareValue = ko.computed(function () {
        var operatorDef = instance.Tool.Operators().find(function (o) {
            return o.type == instance.Operator();
        });

        if (operatorDef) {
            return operatorDef.compareValue;
        }
        return false;
    });

    instance.FilterCompareValueIsBool = ko.computed(function () {
        var operatorDef = instance.Tool.Operators().find(function (o) {
            return o.type == instance.Operator();
        });

        if (operatorDef && operatorDef.compareValueType) {
            return operatorDef.compareValueType == 'bool';
        }
        return instance.FilterColumnIsBool();
    });
    
    instance.FilterCompareValueIsDatetime = ko.computed(function () {
        var operatorDef = instance.Tool.Operators().find(function (o) {
            return o.type == instance.Operator();
        });

        if (operatorDef && operatorDef.compareValueType) {
            return operatorDef.compareValueType == 'datetime';
        }
        return instance.FilterColumnIsDatetime();
    });

    instance.FilterCompareValueIsNumeric = ko.computed(function () {
        var operatorDef = instance.Tool.Operators().find(function (o) {
            return o.type == instance.Operator();
        });

        if (operatorDef && operatorDef.compareValueType) {
            return operatorDef.compareValueType == 'numeric';
        }
        return instance.FilterColumnIsNumeric();
    });

    instance.ShowFilterCompareBool = ko.computed(function() {
        return instance.ShowFilterCompareValue() && instance.FilterCompareColumnIndex() == null && instance.FilterCompareValueIsBool();
    });

    instance.ShowFilterCompareDatetime = ko.computed(function() {
        return instance.ShowFilterCompareValue() && instance.FilterCompareColumnIndex() == null && instance.FilterCompareValueIsDatetime();
    });

    instance.ShowFilterCompareNumeric = ko.computed(function() {
        return instance.ShowFilterCompareValue() && instance.FilterCompareColumnIndex() == null && instance.FilterCompareValueIsNumeric();
    });

    instance.ShowFilterCompareValue1 = ko.computed(function() {
        return instance.FilterCompareValueIsNumeric() == false &&instance.FilterCompareValueIsBool() == false && instance.FilterCompareValueIsDatetime() == false && instance.ShowFilterCompareValue() && instance.FilterCompareColumnIndex() == null;
    });
            
    instance.ShowCaseSensitive = ko.computed(function () {
        var operatorDef = instance.Tool.Operators().find(function(o) {
            return o.type == instance.Operator();
        });

        if (instance.FilterColumnIsText() && operatorDef && operatorDef.showCaseSensitive) {
            return true;
        }
        else {
            return false;
        }
    });

    instance.AllInputColumnsPlusEnteredValue = ko.computed(function() {
        var result = instance.AllInputColumnInfos().slice(0);
        result.splice(0, 0, { Index: null, Name: "Enter a value..."}); // This needs to go at the front of the array in so that a Null Compare Column setting will leave the dropdown on this option
        return result;
    });

    return instance;
};

nodes.Sort = function(properties) {
            
    var instance = new nodes.DataProcessorBase(properties);
    instance.SortColumns = ko.observableArray([{
        SortColumn: ko.observable(),
        Descending: ko.observable(false)
    }]);

    instance.AddSort = function () {
        instance.SortColumns.push({
            SortColumn: ko.observable(),
            Descending: ko.observable(false)
        });
    }

    instance.RemoveSort = function (item, event) {
        instance.SortColumns.remove(item);
    }
    
    instance.OnOptionsUpdated = function(model) {
    }

    var innerGetCoreSettings = instance.GetCoreSettings;
    instance.GetCoreSettings = function() {
        var settings = innerGetCoreSettings();
        
        settings.SortColumns = [];
        settings.SortDirections = [];

        $.each(instance.SortColumns(), function (i, c) {
            settings.SortColumns.push(c.SortColumn());
            settings.SortDirections.push(!c.Descending())
        });

        return settings;
    }

    var innerLoadSettings = instance.LoadSettings;
    instance.LoadSettings = function(settings, model) {
        innerLoadSettings(settings, model);
        instance.SortColumns([]);

        if (settings.SortColumn != null) {
            instance.SortColumns().push({
                SortColumn: ko.observable(settings.SortColumn),
                Descending: ko.observable(settings.Descending | false)
            });
        }

        if (settings.SortColumns != null) {
            $.each(settings.SortColumns, function (i, c) {
                instance.SortColumns().push({
                    SortColumn: ko.observable(c),
                    Descending: ko.observable(false)
                });
            });
        }

        if (settings.SortDirections != null) {
            $.each(settings.SortDirections, function (i, d) {
                instance.SortColumns()[i].Descending(!d);
            });
        }
    }
           
    return instance;
};

var SummarizeStatistic = function(parent, aggFunc, aggCol) {
    var _parent = parent;
    var self = this;
    self.AggFunction = ko.observable(aggFunc);
    self.AggColumn = ko.observable(aggCol);
    self.ShowAggColumn = ko.pureComputed(function() {
        var af = self.AggFunction();
        var afi = _parent.Tool.AggFunctions().filter(function(f) { return f.id == af })[0];
        return afi.requiresColumn;
    });
    self.AvailableAggColumns = ko.pureComputed(function() {
        return _parent.AllInputColumnInfos().filter(function(c) { 
            var af = self.AggFunction();
            var afi = _parent.Tool.AggFunctions().filter(function(f) { return f.id == af })[0];
            return tools.IsNumericType(c.Type) || (tools.IsDatetimeType(c.Type) && afi.WorksWithDates); 
        });
    });
    return self;
};

nodes.Summarize = function(properties) {
    var instance = new nodes.DataProcessorBase(properties);

    instance.ShowGroupBy = ko.observable(false);
    instance.GroupByColumns = ko.observableArray();
    instance.Statistics = ko.observableArray();

    instance.ForEachColumns = ko.computed(function () {
        return instance.AllInputColumns();
    });

    instance.GroupColumns = ko.computed(function () {
        return instance.AllInputColumnInfos();
    });

    instance.GroupByFunctions = function (index) {
        var results = [];
        var col = instance.GroupColumns()[index];
        if (col) {
            if (tools.IsDatetimeType(col.Type)) {
                results = instance.Tool.DateFunctions();
            }
        }

        return results;
    }

    var innerGetCoreSettings = instance.GetCoreSettings;
    instance.GetCoreSettings = function () {
        var settings = innerGetCoreSettings();
        settings.GroupByColumnIndexes = instance.GroupByColumns().map(function (item) { return item.index(); });
        settings.GroupByFunctions = instance.GroupByColumns().map(function (item) { return item.groupByFunction(); });
        settings.AggFunctions = [];
        settings.AggColumnIndexes = [];
        $.each(instance.Statistics(), function (i, statistic) {
            settings.AggFunctions.push(statistic.AggFunction());
            settings.AggColumnIndexes.push(statistic.AggColumn());            
        });
        return settings;
    }

    var innerLoadSettings = instance.LoadSettings;
    instance.LoadSettings = function (settings, model) {
        innerLoadSettings(settings, model);
        var groupBys = [];
        for (var i = 0; i < settings.GroupByColumnIndexes.length; i++) {
            if (settings.GroupByFunctions.length > i) {
                groupBys.push({
                    "index": ko.observable(settings.GroupByColumnIndexes[i]),
                    "groupByFunction": ko.observable(settings.GroupByFunctions[i])
                });
            }
        };
        instance.GroupByColumns(groupBys);

        var statistics = [];
        for (var i = 0; i < settings.AggFunctions.length; i++) {
            if (settings.AggColumnIndexes.length > i) {
                statistics.push(new SummarizeStatistic(instance, settings.AggFunctions[i], settings.AggColumnIndexes[i]));
            }
        }
        instance.Statistics(statistics);
    }

    instance.GetColumnName = function (i) {
        if (instance.AllInputColumns().length > i) {
            return instance.AllInputColumns()[i];
        }
        else {
            return "";
        }
    }

    instance.AddStatistic = function () {
        instance.Statistics.push(new SummarizeStatistic(instance, 2, 0));
    };

    instance.RemoveStatistic = function (item, event) {
        instance.Statistics.remove(item);
    };

    instance.AddGroupBy = function () {
        instance.GroupByColumns.push({
            "index": ko.observable(0),
            "groupByFunction": ko.observable()
        });
    };

    instance.RemoveGroupBy = function (item, event) {
        instance.GroupByColumns.remove(item);
    };

    instance.AddStatistic();

    return instance;
};

nodes.Extract = function(properties) {
    var instance = new nodes.DataProcessorBase(properties);
    instance.InputColumnIndex = ko.observable(0);
    instance.StartType = ko.observable(1);
    instance.StartPosition = ko.observable(1);
    instance.StartSearch = ko.observable("");
    instance.EndType = ko.observable(1);
    instance.EndPosition = ko.observable(0);
    instance.EndSearch = ko.observable("");
    instance.ResultColumnName = ko.observable("");
    instance.ShowStartPosition = ko.computed(function() {
        return instance.StartType() == 2;
    });
    instance.ShowEndPosition = ko.computed(function() {
        return instance.EndType() == 2 || instance.EndType() == 3;
    });
    instance.ShowStartSearch = ko.computed(function() {
        return instance.StartType() > 2;
    });
    instance.ShowEndSearch = ko.computed(function() {
        return instance.EndType() > 3;
    });
    instance.EndPositionText = ko.computed(function() {
        if (instance.EndType() == 3) {
            return "Length";
        }
        else {
            return "Position"
        }
    })


    var innerGetCoreSettings = instance.GetCoreSettings;
    instance.GetCoreSettings = function() {
        var settings = innerGetCoreSettings();
        settings.InputColumnIndex = instance.InputColumnIndex();
        settings.StartType = instance.StartType();
        settings.StartPosition = instance.StartPosition();
        settings.StartSearch = instance.StartSearch();
        settings.EndType = instance.EndType();
        settings.EndPosition = instance.EndPosition();
        settings.EndSearch = instance.EndSearch();
        settings.ResultColumnName = instance.ResultColumnName();
        return settings;
    }

    var innerLoadSettings = instance.LoadSettings;
    instance.LoadSettings = function(settings, model) {
        innerLoadSettings(settings, model);
        instance.InputColumnIndex(settings.InputColumnIndex);
        instance.StartType(settings.StartType);
        instance.StartPosition(settings.StartPosition);
        instance.StartSearch(settings.StartSearch);
        instance.EndType(settings.EndType);
        instance.EndPosition(settings.EndPosition);
        instance.EndSearch(settings.EndSearch);
        instance.ResultColumnName(settings.ResultColumnName);
    };

    return instance;
};

nodes.Append = function(properties) {
    var instance = new nodes.DataProcessorBase(properties);
    instance.IncludeUniqueColumns = ko.observable(true);

    var innerGetCoreSettings = instance.GetCoreSettings;
    instance.GetCoreSettings = function() {
        var settings = innerGetCoreSettings();
        settings.IncludeUniqueColumns = instance.IncludeUniqueColumns();
        return settings;
    }

    var innerLoadSettings = instance.LoadSettings;
    instance.LoadSettings = function(settings, model) {
        innerLoadSettings(settings, model);
        instance.IncludeUniqueColumns(settings.IncludeUniqueColumns);
    }
            
    return instance;
};

// Base class for all Data Visualisation type Workspace Nodes
nodes.DataVisualisationBase = function(properties) {
    var instance = new nodes.DataProcessorBase(properties);
    instance.Type = 'DataVisualisation';

    instance.GetTransmitterPoint = undefined;

    return instance;
};

// Base class for various types of graph
nodes.Graph = function(properties) {
    var instance = new nodes.DataVisualisationBase(properties);
    instance.ChartTitle = ko.observable();
    instance.HorizontalAxis = ko.observable();
    instance.HorizontalAxisLabel = ko.observable();
    instance.VerticalAxisLabel = ko.observable();
    instance.DataSeriesColumnIndexes = ko.observableArray();
    instance.Values1 = ko.observable();

    var innerGetCoreSettings = instance.GetCoreSettings;
    instance.GetCoreSettings = function () {
        var settings = innerGetCoreSettings();
        settings.HorizontalAxis = instance.HorizontalAxis();
        settings.DataSeriesColumnIndexes = instance.DataSeriesColumnIndexes();
        return settings;
    };

    var innerGetSaveSettings = instance.GetSaveSettings;
    instance.GetSaveSettings = function () {
        var settings = innerGetSaveSettings();
        settings.ChartTitle = instance.ChartTitle();
        settings.HorizontalAxisLabel = instance.HorizontalAxisLabel();
        settings.VerticalAxisLabel = instance.VerticalAxisLabel();
        return settings;
    };

    var innerLoadSettings = instance.LoadSettings;
    instance.LoadSettings = function (settings, model) {
        innerLoadSettings(settings, model);
        instance.ChartTitle(settings.ChartTitle)
        instance.HorizontalAxis(settings.HorizontalAxis);
        instance.HorizontalAxisLabel(settings.HorizontalAxisLabel);
        instance.VerticalAxisLabel(settings.VerticalAxisLabel);
        instance.DataSeriesColumnIndexes(settings.DataSeriesColumnIndexes);
        instance.Values1(settings.Values1);
    };

    instance.RemoveAll = function() {
        instance.DataSeriesColumnIndexes.removeAll();
    }

    instance.AddAll = function() {
        instance.DataSeriesColumnIndexes.removeAll();
        $.each(instance.AllInputColumnInfos(), function(i, info) {
            instance.DataSeriesColumnIndexes.push(info.Index);
        });
    }

    instance.RemoveItem = function(item, event) {
        instance.DataSeriesColumnIndexes.splice($(event.target).parent().prevAll().length, 1);
    }

    instance.GetColumnName = function(i) {
        if (instance.AllInputColumns().length > i) {
            return instance.AllInputColumns()[i];
        }
        else {
            return "";
        }
    }

    var innerOnInputsUpdated = instance.OnInputsUpdated;
    instance.OnInputsUpdated = function(model) {
        innerOnInputsUpdated(model);
        if (instance.DataSeriesColumnIndexes().length == 0 && instance.Values1() != null && instance.Inputs().length > 0) {
            var input1 = model.GetNodeById(instance.Inputs()[0]);
            $.each(input1.Columns(), function(i, inputCol) {
                if (inputCol == instance.Values1()) {
                    instance.DataSeriesColumnIndexes([ i ]);
                }
            })
        }
    }

    return instance;
}

nodes.LineChart = function (properties) {
    var instance = new nodes.Graph(properties);
    instance.RenderResults = function (resultsContainer, model) {
        if ($(resultsContainer).hasClass("chart") === false) {
            $(resultsContainer).addClass("chart")
        }

        if ($(resultsContainer).hasClass("linechart") === false) {
            $(resultsContainer).addClass("linechart")
        }

        $(resultsContainer).empty();

        if (instance.Inputs().length > 0 && instance.HorizontalAxis() != null && instance.DataSeriesColumnIndexes().length > 0) {
            backend.LoadData(models.ServerQueryKey, models.GetCoreNodeSettings(), models.SelectedNode().Id, null, null, "JSON", null,
                function (data) {

                    var margin = { top: 20, right: 20, bottom: 40, left: 50 },
                        width = $(resultsContainer).innerWidth() - margin.left - margin.right,
                        height = $(resultsContainer).innerHeight() - margin.top - margin.bottom;


                    var xScale, xAxis, xSelector;
                    if (tools.IsDatetimeType(data.columnTypes[0])) {
                        xSelector = function (d) { return new Date(d[0]); };

                        xScale = d3.time.scale()
                            .domain(d3.extent(data.rows, xSelector))
                            .range([0, width]);

                        xAxis = d3.svg.axis()
                            .scale(xScale)
                            .orient("bottom")
                            .ticks(5);
                    } else {
                        xSelector = function (d) { return d[0]; };

                        xScale = d3.scale.linear()
                            .domain(d3.extent(data.rows, xSelector))
                            .range([0, width]);

                        xAxis = d3.svg.axis()
                            .scale(xScale)
                            .orient("bottom")
                            .ticks(5);
                    }

                    var min = Math.min.apply(null, data.rows.map(function (row) { return Math.min.apply(null, row.slice(1)) }));;
                    var max = Math.max.apply(null, data.rows.map(function (row) { return Math.max.apply(null, row.slice(1)) }));


                    var yScale = d3.scale.linear()
                        .domain([min, max])
                        .range([height, 0]);

                    var yAxis = d3.svg.axis()
                        .scale(yScale)
                        .orient("left")
                        .ticks(5);

                    var parent = $(resultsContainer).empty();

                    // create svg
                    var svg = d3.select('#' + parent.attr('id'))
                        .append('svg')
                        .attr("width", width + margin.left + margin.right)
                        .attr("height", height + margin.top + margin.bottom);
                    
                    var inner = svg.append("g")
                       .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                    // x axis
                    var xAxisGroup = inner.append("g")
                            .attr("transform", "translate(0," + height + ")");
                    
                    xAxisGroup.call(xAxis)

                    xAxisGroup.selectAll("line,path")
                        .attr("fill", "none")
                        .attr("stroke", "#333333")
                        .attr("shape-rendering", "crispEdges");

                    xAxisGroup.selectAll("text")
                        .attr("font-family", "sans-serif")
                        .attr("text-anchor", "end")
                        .attr("font-size", "11px");

                    var xTitle = instance.HorizontalAxisLabel();
                    if (xTitle) {
                        xAxisGroup.append("text")
                                .attr("class", "label")
                                .attr("text-anchor", "middle")
                                .attr("x", width / 2)
                                .attr("y", margin.bottom - 6)
                                .text(xTitle);
                    }

                    // y axis
                    var yAxisGroup = inner.append("g");;

                    yAxisGroup.call(yAxis);

                    yAxisGroup.selectAll("text")
                        .attr("font-family", "sans-serif")
                        .attr("text-anchor", "end")
                        .attr("font-size", "11px");

                    yAxisGroup.selectAll("line,path")
                        .attr("fill", "none")
                        .attr("stroke", "#333333")
                        .attr("shape-rendering", "crispEdges");

                    var yTitle = instance.VerticalAxisLabel()
                    if (yTitle) {
                        yAxisGroup.append("text")
                                .attr("transform", "rotate(-90)")
                                .attr("x", -(height / 2))
                                .attr("y", -(margin.left - 6))
                                .attr("dy", ".71em")
                                .style("text-anchor", "middle")
                                .text(yTitle);
                    }

                    for (var i = 1; i < data.columns.length; i++) {
                        var line = d3.svg.line()
                        .x(function (d) {
                            return xScale(xSelector(d));
                        })
                        .y(function (d) {
                            return yScale(d[i]);
                        });

                        // create lines
                        inner.append("path")
                            .datum(data.rows)
                            .attr("fill", "none")
                            .attr("d", line)
                            .attr("stroke", instance.Tool.GetSeriesColor(i, 1))
                            .attr("stroke-width", "1px");
                    }
                }
            );
        }
    };

    return instance;
};

nodes.BarChart = function(properties) {
    var instance = new nodes.Graph(properties);
    instance.RenderResults = function (resultsContainer, model) {
        if ($(resultsContainer).hasClass("chart") === false) {
            $(resultsContainer).addClass("chart")
        }

        if ($(resultsContainer).hasClass("barchart") === false) {
            $(resultsContainer).addClass("barchart")
        }

        if (instance.Inputs().length > 0 && instance.HorizontalAxis() != null && instance.DataSeriesColumnIndexes().length > 0) {
            backend.LoadData(models.ServerQueryKey, models.GetCoreNodeSettings(), models.SelectedNode().Id, null, null, "JSON", null,
                function (data) {
                    var margin = { top: 20, right: 20, bottom: 40, left: 50 },
                                            width = $(resultsContainer).innerWidth() - margin.left - margin.right,
                                            height = $(resultsContainer).innerHeight() - margin.top - margin.bottom;

                    var xSelector = function (d) { return d[0]; };

                    var theData = data.rows.slice(0, 25);

                    var xScale = d3.scale.ordinal()
                        .domain(theData.map(xSelector))
                        .rangeRoundPoints([0, width], 1)

                    var xAxis = d3.svg.axis()
                        .scale(xScale)
                        .orient("bottom")
                        .ticks(theData.length);

                    var min = 0; //Math.min.apply(null, theData.map(function (row) { return Math.min.apply(null, row.slice(1)) }));;
                    var max = Math.max.apply(null, theData.map(function (row) { return Math.max.apply(null, row.slice(1)) }));


                    var yScale = d3.scale.linear()
                        .domain([min, max])
                        .range([height, 0]);

                    var yAxis = d3.svg.axis()
                        .scale(yScale)
                        .orient("left")
                        .ticks(5);

                    var parent = $(resultsContainer).empty();

                    // create svg
                    var svg = d3.select('#' + parent.attr('id'))
                        .append('svg')
                        .attr("width", width + margin.left + margin.right)
                        .attr("height", height + margin.top + margin.bottom);

                    var inner = svg.append("g")
                       .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                    // x axis
                    var xAxisGroup = inner.append("g")
                            .attr("transform", "translate(0," + height + ")");

                    xAxisGroup.call(xAxis);

                    xAxisGroup.selectAll("line,path")
                        .attr("fill", "none")
                        .attr("stroke", "#333333")
                        .attr("shape-rendering", "crispEdges");

                    xAxisGroup.selectAll(".domain")
                        .attr("stroke", "none");

                    xAxisGroup.selectAll("text")
                        .style("text-anchor", "end")
                        .attr("dx", "-.8em")
                        .attr("dy", ".15em")
                        .attr("transform", "rotate(-65)")
                        .attr("font-family", "sans-serif")
                        .attr("text-anchor", "end")
                        .attr("font-size", "11px");

                    var xTitle = instance.HorizontalAxisLabel();
                    if (xTitle) {
                        xAxisGroup.append("text")
                                .attr("class", "label")
                                .attr("text-anchor", "middle")
                                .attr("x", width / 2)
                                .attr("y", margin.bottom - 6)
                                .text(xTitle);
                    }

                    // y axis
                    var yAxisGroup = inner.append("g");

                    yAxisGroup.call(yAxis);

                    yAxisGroup.selectAll("text")
                        .attr("font-family", "sans-serif")
                        .attr("text-anchor", "end")
                        .attr("font-size", "11px");

                    yAxisGroup.selectAll("line,path")
                        .attr("fill", "none")
                        .attr("stroke", "#333333")
                        .attr("shape-rendering", "crispEdges");

                    var yTitle = instance.VerticalAxisLabel()
                    if (yTitle) {
                        yAxisGroup.append("text")
                                .attr("transform", "rotate(-90)")
                                .attr("x", -(height / 2))
                                .attr("y", -(margin.left - 6))
                                .attr("dy", ".71em")
                                .style("text-anchor", "middle")
                                .text(yTitle);
                    }

                    var xOffset = 0;
                    var xSpace = width / theData.length;
                    if (theData.length > 1) {
                        var range = xScale.range();
                        xSpace = range[1] - range[0];
                        for (var i = 1; i + 1 < theData.length; i++) {
                            var diff = range[i + 1] - range[i]
                            if (diff < xSpace) {
                                xSpace = diff;
                            }
                        }
                        xOffset = range[0] - (xSpace / 2);
                    }

                    var bars = inner.append("g")
                        .selectAll("g")
                        .data(theData)
                        .enter().append("g")
                        .attr("transform", function (d, j) { return "translate(" + (xOffset + (j * xSpace)) + ",0)"; });

                    var barMargin = 6;
                    var barWidth = (xSpace - (2 * barMargin)) / (data.columns.length - 1);

                    for (var i = 1; i < data.columns.length; i++) {

                        bars.append("rect")
                            .attr("x", barMargin + ((i - 1) * barWidth))
                            .attr("y", function (d) { return yScale(d[i]); })
                            .attr("height", function (d) { return height - yScale(d[i]); })
                            .attr("width", barWidth - 1)
                            .on('mouseover', function (d) {
                                d3.select(this.parentNode).selectAll("rect").attr("opacity", 0.8);
                                d3.select(this.parentNode).selectAll("text").attr("fill", "black");
                            }).on('mouseout', function (d) {
                                d3.select(this.parentNode).selectAll("rect").attr("opacity", 1);
                                d3.select(this.parentNode).selectAll("text").attr("fill", "none");
                            })
                            .attr("fill", instance.Tool.GetSeriesColor(i, 1));

                        bars.append("text")
                            .attr("text-anchor", "middle")
                            .attr("fill", "none")
                            .attr("x", barMargin + ((i - .5) * barWidth))
                            .attr("y", function (d) { return yScale(d[i]) - 3; })
                            .text(function (d) { return d[i]; });
                    }

                    svg.attr("height", $('svg > g').get(0).getBBox().height + 6);

                    $(".bar").css("background-color", "Red");
                }
            );
        }
        else {
            $(resultsContainer).empty();
        }
    };

    return instance;
};

nodes.PieChart = function (properties) {
    var instance = new nodes.Graph(properties);

    instance.MinPercentage = ko.observable(1);

    instance.LabelType = ko.observable();

    instance.LabelTypes = ["Name Only", "Name and Value", "Name and Percentage"];

    instance.Colours = ['#98abc5', '#8a89a6', '#7b6888', '#6b486b', '#a05d56', '#d0743c', '#ff8c00', '#7283a2'];

    instance.OtherColour = '#BBB';

    var innerGetSaveSettings = instance.GetSaveSettings;
    instance.GetSaveSettings = function () {
        var settings = innerGetSaveSettings();
        settings.LabelType = instance.LabelType();
        settings.MinPercentage = instance.MinPercentage();
        return settings;
    };


    var innerLoadSettings = instance.LoadSettings;
    instance.LoadSettings = function (settings, model) {
        innerLoadSettings(settings, model);
        instance.LabelType(settings.LabelType);
        instance.MinPercentage(settings.MinPercentage);
    }


    instance.AllNumericInputColumnInfos = ko.pureComputed(function () {
        return instance.AllInputColumnInfos()
            .filter(function (colInfo) {
                return tools.IsNumericType(colInfo.Type)
            });
    });

    instance.DataSeriesColumnIndexes.push(null);


    instance.VerticalAxis = ko.pureComputed({
        read: function () {
            return instance.DataSeriesColumnIndexes()[0];
        },
        write: function (value) {
            instance.DataSeriesColumnIndexes()[0] = value;
        },
        owner: instance
    });

    instance.RenderResults = function (resultsContainer, model) {
        if ($(resultsContainer).hasClass("chart") === false) {
            $(resultsContainer).addClass("chart")
        }

        if ($(resultsContainer).hasClass("piechart") === false) {
            $(resultsContainer).addClass("piechart")
        }

        if (instance.Inputs().length > 0 && instance.HorizontalAxis() != null && instance.DataSeriesColumnIndexes().length > 0) {
            backend.LoadData(models.ServerQueryKey, models.GetCoreNodeSettings(), models.SelectedNode().Id, null, null, "JSON", null,
                function (data) {
                    var margin = { top: 20, right: 20, bottom: 20, left: 50 },
                        width = $(resultsContainer).innerWidth() - margin.left - margin.right,
                        height = $(resultsContainer).innerHeight() - margin.top - margin.bottom,
                        radius = Math.min(width, height) / 2;
                    
                    var unfilteredData = data.rows.slice(0, 25)
                        .sort(function (a, b) { return b[1] - a[1]; });

                    var total = unfilteredData.reduce(function (acc, item) { return acc + item[1]; }, 0),
                        other = 0,
                        filteredData = [];
                    
                    $.each(unfilteredData, function (i, datum) {
                        if (total != 0) {
                            datum[2] = 100 * datum[1] / total;
                            if (datum[2] >= instance.MinPercentage()) {
                                datum[3] = false;
                                filteredData.push(datum);
                            } else {
                                other += datum[1];
                            }
                        } else {
                            datum[2] = null;
                            datum[3] = false;
                            filteredData.push(datum);
                        }
                    });

                    if (other > 0) {
                        filteredData.push(["Other", other, total != 0 ? other / total : null, true]);
                    }

                    var pie = d3.layout.pie()
                        .sort(null)
                        .startAngle(-0.25 * Math.PI)
                        .endAngle(1.75 * Math.PI)
	                    .value(function (d) {
	                        return d[1];
	                    });

                    var arc = d3.svg.arc()
	                    .outerRadius(radius * 0.8)
	                    .innerRadius(radius * 0.4);

                    var outerArc = d3.svg.arc()
	                    .outerRadius(radius * 0.9)
	                    .innerRadius(radius * 0.9);

                    var parent = $(resultsContainer).empty();

                    // create svg
                    var svg = d3.select('#' + parent.attr('id'))
                        .append('svg')
                        .attr("width", width + margin.left + margin.right)
                        .attr("height", height + margin.top + margin.bottom);

                    var g = svg.append("g")
                       .attr("transform", "translate(" + (margin.left + (width / 2)) + "," + (margin.top + (height / 2)) + ")");
                        
                    var lineFunction = d3.svg.line()
                        .x(function (d) { return d[0]; })
                        .y(function (d) { return d[1]; })
                        .interpolate("linear");

                    var getLabel = function (segment) {
                        var result = segment.data[0]

                        if (instance.LabelType() == "Name and Value") {
                            result += " (" + segment.data[1] + ")";
                        } else if (instance.LabelType() == "Name and Percentage") {
                            if (segment.data[2] != null) {
                                result += " (" + parseFloat(segment.data[2].toPrecision(3)) + "%)";
                            } else {
                                result += " (" + segment.data[1] + ")";
                            }
                        }
                        return result;
                    }

                    $.each(pie(filteredData), function (i, segment) {
                        var segmentGrp = g.append("g"),
                            innerPoint = arc.centroid(segment),
                            outerPoint = outerArc.centroid(segment),
                            onLeftSide = outerPoint[0] < 0,
                            textPoint = [onLeftSide ? -radius : radius, outerPoint[1]];
                        
                        var slice = segmentGrp.append("path")
                            .attr("fill", (segment.data[3] ? instance.OtherColour : instance.Colours[i % instance.Colours.length]))
                            .attr("d", arc(segment));

                        var lineGraph = segmentGrp.append("path")
                            .attr("d", lineFunction([innerPoint, outerPoint, textPoint]))
                            .attr("stroke", "black")
                            .attr("stroke-width", 1)
                            .attr("fill", "none");

                        var text = segmentGrp.append("text")
                            .text(getLabel(segment))
                            .attr('x', textPoint[0])
                            .attr('y', textPoint[1])
                            .attr('text-anchor', onLeftSide ? 'end' : 'start')
                            .attr('alignment-baseline', 'middle');

                    })
                }
            );
        }
        else {
            $(resultsContainer).empty();
        }
    };

    return instance;
};