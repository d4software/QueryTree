// 'tools' Module
//
// Defines a number of different tool classes that can be used to populate
// the toolbar of the application workspace
//
// Depends on: nodes.js, knockout.js

tools = {
    TemplatesFolder: "/partials/"
};

tools.ToolBase = function(properties) {
    var instance = {};

    instance.Name = properties.Name;
    instance.Visible = properties.Visible;
    instance.Title = properties.Title;
    instance.Description = properties.Description;
    instance.SymbolPath = properties.SymbolPath;
    instance.CreatedCount = 0;
    instance.OpenOptionsOnDrop = false;
    instance.AllowConnectOnDrop = true;
    instance.MaxInputs = 0;
    instance.AllowImageExport = false;
    instance.HelpUrl = null;

    instance.createNode = function(name, y, x, id) {
        this.CreatedCount += 1;
        return new properties.NodeType({
            Name: name,
            Top: y, 
            Left: x, 
            SymbolPath: properties.SymbolPath,
            OptionsTemplateUrl: properties.OptionsTemplateUrl,
            Tool: this,
            Id: id
        });
    }

    instance.Colors = [
        [100, 100, 255],
        [255, 100, 100],
        [100, 255, 100],
        [100, 255, 255],
        [255, 255, 100],
        [255, 100, 255]
    ];

    instance.GetSeriesColor = function(seriesNumber, opacity) {
        var baseColor = instance.Colors[seriesNumber % instance.Colors.length].slice(0);
        var offset = 100 / Math.floor(seriesNumber / instance.Colors.length);
        if (seriesNumber >= instance.Colors.length) {
            for (var i = 0; i < baseColor.length; i++) {
                baseColor[i] -= offset;
            }
        }

        return "rgba(" + baseColor[0] + "," + baseColor[1] + "," + baseColor[2] + "," + opacity + ")";
    };

    return instance;
};

tools.DatabaseTable = function() {
    var instance = new tools.ToolBase({
        Name: "Data Table",
        Title: "Data Table",
        Visible: true,
        Description: "Loads a database table", 
        SymbolPath: "M15.499,23.438c-3.846,0-7.708-0.987-9.534-3.117c-0.054,0.236-0.09,0.48-0.09,0.737v3.877c0,3.435,4.988,4.998,9.625,4.998s9.625-1.563,9.625-4.998v-3.877c0-0.258-0.036-0.501-0.09-0.737C23.209,22.451,19.347,23.438,15.499,23.438zM15.499,15.943c-3.846,0-7.708-0.987-9.533-3.117c-0.054,0.236-0.091,0.479-0.091,0.736v3.877c0,3.435,4.988,4.998,9.625,4.998s9.625-1.563,9.625-4.998v-3.877c0-0.257-0.036-0.501-0.09-0.737C23.209,14.956,19.347,15.943,15.499,15.943zM15.5,1.066c-4.637,0-9.625,1.565-9.625,5.001v3.876c0,3.435,4.988,4.998,9.625,4.998s9.625-1.563,9.625-4.998V6.067C25.125,2.632,20.137,1.066,15.5,1.066zM15.5,9.066c-4.211,0-7.625-1.343-7.625-3c0-1.656,3.414-3,7.625-3s7.625,1.344,7.625,3C23.125,7.724,19.711,9.066,15.5,9.066z",
        NodeType: nodes.DatabaseTable,
        OptionsTemplateUrl: tools.TemplatesFolder + "DatabaseTable.html",
    });
    instance.OpenOptionsOnDrop = true;
    instance.HelpUrl = "http://querytreeapp.com/help/tools/data-table/"

    return instance;
};
        
tools.Join = function() {
    var instance = new tools.ToolBase({
        Name: "Join",
        Title: "Join",
        Visible: true,
        Description: "Link two tables together where two column values are the same", 
        SymbolPath: "M29.342,15.5L21.785999999999998,11.137V13.75H20.374999999999996C19.586999999999996,13.74,19.043999999999997,13.509,18.355999999999995,13.007C17.334999999999994,12.262,16.261999999999993,10.826,14.804999999999994,9.439C13.367,8.06,11.291,6.73,8.5,6.749H2.812V10.248999999999999H8.5C10.731,10.261,11.940999999999999,11.434,13.57,13.183C14.267,13.936,14.998000000000001,14.763,15.894,15.506C14.498000000000001,16.671,13.482,18.022,12.41,19.007C11.227,20.088,10.208,20.73,8.498000000000001,20.748H2.813V24.248H8.529C12.280999999999999,24.249000000000002,14.564,21.929000000000002,16.148,20.182000000000002C16.965,19.287000000000003,17.685,18.491000000000003,18.357,17.991000000000003C19.043,17.489000000000004,19.587,17.259000000000004,20.374,17.249000000000002H21.785999999999998V19.863000000000003L29.342,15.5Z",
        NodeType: nodes.Join,
        OptionsTemplateUrl: tools.TemplatesFolder + "Join.html"
    });
            
    instance.JoinType = ko.observableArray([
        { id: "Inner", text: "Only matches from both" }, // Inner Join
        { id: "LeftOuter", text: "All of Table 1, with matches from Table 2" }, // Left Outer Join
        { id: "RightOuter", text: "All of Table 2, with matches from Table 1" }, // Right Outer Join
        { id: "FullOuter", text: "All of both tables, matched where possible" }, // Full Outer Join
        { id: "Cross", text: "Every possible combination" } // Cross Join
    ]);
    instance.MaxInputs = 2;
    instance.HelpUrl = "http://querytreeapp.com/help/tools/join/"

    return instance;
};

tools.Filter = function() {
    var instance = new tools.ToolBase({
        Name: "Filter",
        Title: "Filter",
        Visible: true,
        Description: "Remove rows from a table that don't meet certain criteria", 
        SymbolPath: "M29.772,26.433L22.645999999999997,19.307C23.605999999999998,17.724,24.168999999999997,15.871999999999998,24.169999999999998,13.886C24.169,8.093,19.478,3.401,13.688,3.399C7.897,3.401,3.204,8.093,3.204,13.885C3.204,19.674,7.897,24.366,13.688,24.366C15.675,24.366,17.527,23.803,19.11,22.843L26.238,29.97L29.772,26.433ZM7.203,13.885C7.2090000000000005,10.303,10.106,7.407,13.687000000000001,7.399C17.266000000000002,7.407,20.165,10.303,20.171,13.885C20.163999999999998,17.465,17.266,20.361,13.687,20.369C10.106,20.361,7.209,17.465,7.203,13.885Z",
        NodeType: nodes.Filter,
        OptionsTemplateUrl: tools.TemplatesFolder + "Filter.html"
    });

    instance.Operators = ko.observableArray([
        { type: "EqualTo", simpleName: 'is equal to', number: true, text: true, date: true, bool: true, compareValue: true, showCaseSensitive: true },
        { type: "DoesNotEqual", simpleName: 'is not equal to', number: true, text: true, date: true, bool: true, compareValue: true, showCaseSensitive: true },
        { type: "GreaterThan", simpleName: 'is greater than', number: true, text: true, date: true, bool: false, compareValue: true, showCaseSensitive: false },
        { type: "GreaterThanOrEqualTo", simpleName: 'is greater than or equal to', number: true, text: true, date: true, bool: false, compareValue: true, showCaseSensitive: false },
        { type: "LessThan", simpleName: 'is less than', number: true, text: true, date: true, bool: false, compareValue: true, showCaseSensitive: false },
        { type: "LessThanOrEqualTo", simpleName: 'is less than or equal to', number: true, text: true, date: true, bool: false, compareValue: true, showCaseSensitive: false },
        { type: "StartsWith", simpleName: 'starts with', number: false, text: true, date: false, bool: false, compareValue: true, showCaseSensitive: true },
        { type: "EndsWith", simpleName: 'ends with', number: false, text: true, date: false, bool: false, compareValue: true, showCaseSensitive: true },
        { type: "Contains", simpleName: 'contains', number: false, text: true, date: false, bool: false, compareValue: true, showCaseSensitive: true },
        { type: "DoesNotContain", simpleName: 'doesn\'t contain', number: false, text: true, date: false, bool: false, compareValue: true, showCaseSensitive: true },
        { type: "IsEmpty", simpleName: 'is empty', number: true, text: true, date: true, bool: true, compareValue: false, showCaseSensitive: false },
        { type: "IsNotEmpty", simpleName: 'is not empty', number: true, text: true, date: true, bool: true, compareValue: false, showCaseSensitive: false },
        { type: "Last24Hours", simpleName: 'was in the last 24 hours', number: false, text: false, date: true, bool: false, compareValue: false, showCaseSensitive: false },
        { type: "Next24Hours", simpleName: 'is in the next 24 hours', number: false, text: false, date: true, bool: false, compareValue: false, showCaseSensitive: false },
        { type: "Last7Days", simpleName: 'was in the last 7 days', number: false, text: false, date: true, bool: false, compareValue: false, showCaseSensitive: false },
        { type: "Next7Days", simpleName: 'is in the next 7 days', number: false, text: false, date: true, bool: false, compareValue: false, showCaseSensitive: false },
        { type: "ThisMonth", simpleName: 'is this month', number: false, text: false, date: true, bool: false, compareValue: false, showCaseSensitive: false },
        { type: "NextMonth", simpleName: 'is next month', number: false, text: false, date: true, bool: false, compareValue: false, showCaseSensitive: false },
        { type: "LastMonth", simpleName: 'was last month', number: false, text: false, date: true, bool: false, compareValue: false, showCaseSensitive: false },
        { type: "Last90Days", simpleName: 'was in the last 90 days', number: false, text: false, date: true, bool: false, compareValue: false, showCaseSensitive: false },
        { type: "Next90Days", simpleName: 'is in the next 90 days', number: false, text: false, date: true, bool: false, compareValue: false, showCaseSensitive: false }
    ]);
    instance.MaxInputs = 1;
    instance.HelpUrl = "http://querytreeapp.com/help/tools/filter/";

    return instance;
};

tools.Sort = function() {
    var instance = new tools.ToolBase({ 
        Name: "Sort",
        Title: "Sort",
        Visible: true,
        Description: "Sort the rows into ascending or descending order of values", 
        SymbolPath: "M21.786,20.654C21.168000000000003,20.459,20.379,19.951,19.495,19.067C18.738,18.325,17.956,17.369,17.155,16.326C16.964000000000002,16.582,16.773,16.836000000000002,16.581,17.096C16.057,17.805,15.522,18.52,14.977,19.223C16.881,21.532999999999998,18.857,23.801,21.786,24.174999999999997V26.875999999999998L29.342000000000002,22.513999999999996L21.786,18.151999999999994V20.654ZM9.192,11.933C9.948,12.674,10.73,13.629999999999999,11.531,14.672C11.726,14.41,11.921000000000001,14.151,12.118,13.884C12.638,13.181000000000001,13.169,12.472000000000001,13.71,11.774000000000001C11.678,9.311,9.577000000000002,6.867000000000001,6.314000000000001,6.7490000000000006H2.814000000000001V10.249H6.314000000000001C6.969,10.223,7.996,10.735,9.192,11.933ZM21.786,10.341V12.876L29.342000000000002,8.512999999999998L21.786,4.149999999999998V6.796999999999997C19.882,7.015999999999997,18.361,8.144999999999998,17.035,9.440999999999997C14.839,11.623999999999997,12.919,14.607999999999997,11.024000000000001,16.979C9.157,19.416999999999998,7.283000000000001,20.866999999999997,6.312000000000001,20.75H2.812000000000001V24.25H6.312000000000001C8.497000000000002,24.221,10.191,22.984,11.652000000000001,21.557C13.846,19.372999999999998,15.768,16.39,17.661,14.018999999999998C19.205,12.003,20.746,10.679,21.786,10.341Z",
        NodeType: nodes.Sort,
        OptionsTemplateUrl: tools.TemplatesFolder + "Sort.html"
    });
    instance.MaxInputs = 1;
    instance.HelpUrl = "http://querytreeapp.com/help/tools/sort/";

    return instance;
};

tools.Select = function() {
    var instance = new tools.ToolBase({
        Name: "Select",
        Title: "Select",
        Visible: true,
        Description: "Pick which columns you want and in what order they should appear",
        SymbolPath: "M29.548,3.043c-1.081-0.859-2.651-0.679-3.513,0.401L16,16.066l-3.508-4.414c-0.859-1.081-2.431-1.26-3.513-0.401c-1.081,0.859-1.261,2.432-0.401,3.513l5.465,6.875c0.474,0.598,1.195,0.944,1.957,0.944c0.762,0,1.482-0.349,1.957-0.944L29.949,6.556C30.809,5.475,30.629,3.902,29.548,3.043zM24.5,24.5h-17v-17h12.756l2.385-3H6C5.171,4.5,4.5,5.171,4.5,6v20c0,0.828,0.671,1.5,1.5,1.5h20c0.828,0,1.5-0.672,1.5-1.5V12.851l-3,3.773V24.5z",
        NodeType: nodes.Select,
        OptionsTemplateUrl: tools.TemplatesFolder + "Select.html"
    });
    instance.MaxInputs = 1;
    instance.HelpUrl = "http://querytreeapp.com/help/tools/select/";

    return instance;
}

tools.Append = function() {
    var instance = new tools.ToolBase({ 
        Name: "Append",
        Title: "Append",
        Visible: true,
        Description: "Create a table from the child values on each row of the source table", 
        SymbolPath: "M26.679,7.858c-0.176-0.138-0.404-0.17-0.606-0.083l-9.66,4.183c-0.42,0.183-0.946,0.271-1.486,0.271c-0.753,0.002-1.532-0.173-2.075-0.412c-0.194-0.083-0.356-0.176-0.471-0.259c0.042-0.021,0.09-0.042,0.146-0.064l8.786-3.804l1.31,0.561V6.612c0-0.244-0.106-0.475-0.283-0.612c-0.176-0.138-0.406-0.17-0.605-0.083l-9.66,4.183c-0.298,0.121-0.554,0.268-0.771,0.483c-0.213,0.208-0.397,0.552-0.394,0.934c0,0.01,0.003,0.027,0.003,0.027v14.73c0,0.006-0.002,0.012-0.002,0.019c0,0.005,0.002,0.007,0.002,0.012v0.015h0.002c0.021,0.515,0.28,0.843,0.528,1.075c0.781,0.688,2.091,1.073,3.484,1.093c0.66,0,1.33-0.1,1.951-0.366l9.662-4.184c0.255-0.109,0.422-0.383,0.422-0.692V8.471C26.961,8.227,26.855,7.996,26.679,7.858zM20.553,5.058c-0.017-0.221-0.108-0.429-0.271-0.556c-0.176-0.138-0.404-0.17-0.606-0.083l-9.66,4.183C9.596,8.784,9.069,8.873,8.53,8.873C7.777,8.874,6.998,8.699,6.455,8.46C6.262,8.378,6.099,8.285,5.984,8.202C6.026,8.181,6.075,8.16,6.13,8.138l8.787-3.804l1.309,0.561V3.256c0-0.244-0.106-0.475-0.283-0.612c-0.176-0.138-0.407-0.17-0.606-0.083l-9.66,4.183C5.379,6.864,5.124,7.011,4.907,7.227C4.693,7.435,4.51,7.779,4.513,8.161c0,0.011,0.003,0.027,0.003,0.027v14.73c0,0.006-0.001,0.013-0.001,0.019c0,0.005,0.001,0.007,0.001,0.012v0.016h0.002c0.021,0.515,0.28,0.843,0.528,1.075c0.781,0.688,2.091,1.072,3.485,1.092c0.376,0,0.754-0.045,1.126-0.122V11.544c-0.01-0.7,0.27-1.372,0.762-1.856c0.319-0.315,0.708-0.564,1.19-0.756L20.553,5.058z",
        NodeType: nodes.Append,
        OptionsTemplateUrl: tools.TemplatesFolder + "Append.html"
    });
    instance.MaxInputs = 9999;
    instance.HelpUrl = "http://querytreeapp.com/help/tools/append/";

    return instance;
};

tools.LineChart = function() {
    var instance = new tools.ToolBase({ 
        Name: "Line Chart",
        Title: "Line Chart",
        Visible: true,
        Description: "Draw a line chart with lines coming from one or more columns on the source table", 
        SymbolPath: "M3.625,25.062C3.086,24.947000000000003,2.74,24.416,2.855,23.875L2.855,23.875L6.51,6.584L8.777,15.843L10.7,10.655000000000001L14.280999999999999,14.396L18.163999999999998,1.293000000000001L21.098,13.027000000000001L23.058,11.518L28.329,23.258000000000003C28.555,23.762000000000004,28.329,24.353,27.824,24.579000000000004L27.824,24.579000000000004C27.319000000000003,24.806000000000004,26.728,24.579000000000004,26.502000000000002,24.075000000000003L26.502000000000002,24.075000000000003L22.272000000000002,14.647000000000002L19.898000000000003,16.473000000000003L18.002000000000002,8.877000000000002L15.219000000000003,18.270000000000003L11.465000000000003,14.346000000000004L8.386,22.66L6.654999999999999,15.577L4.811999999999999,24.288C4.710999999999999,24.76,4.297,25.082,3.8329999999999993,25.082L3.8329999999999993,25.082C3.765,25.083,3.695,25.076,3.625,25.062L3.625,25.062Z",
        NodeType: nodes.LineChart,
        OptionsTemplateUrl: tools.TemplatesFolder + "LineChart.html"
    });
    instance.MaxInputs = 1;
    instance.AllowImageExport = true;
    instance.HelpUrl = "http://querytreeapp.com/help/tools/line-chart/";

    return instance;
};

tools.BarChart = function() {
    var instance = new tools.ToolBase({ 
        Name: "Bar Chart",
        Title: "Bar Chart",
        Visible: true,
        Description: "Draw a bar chart with the the size of the bars coming from one or more columns on the source table", 
        SymbolPath: "M21.25,8.375V28H27.75V8.375H21.25ZM12.25,28H18.75V4.125H12.25V28ZM3.25,28H9.75V12.625H3.25V28Z",
        NodeType: nodes.BarChart,
        OptionsTemplateUrl: tools.TemplatesFolder + "BarChart.html"
    });
    instance.MaxInputs = 1;
    instance.AllowImageExport = true;
    instance.HelpUrl = "http://querytreeapp.com/help/tools/bar-chart/";

    return instance;
};

tools.PieChart = function () {
    var instance = new tools.ToolBase({
        Name: "Pie Chart",
        Title: "Pie Chart",
        Visible: true,
        Description: "Draw a pie chart with the the size of the segments coming from one of columns on the source table",
        SymbolPath: "M17.203,10.187c0.959,0.194,1.862,0.652,2.62,1.358l6.851-5.207c-0.063-0.073-0.116-0.151-0.182-0.222c-2.5-2.758-5.845-4.275-9.283-4.543L17.203,10.187zM29.744,18.748c0.867-3.688,0.219-7.666-1.97-10.958l-6.838,5.198c0.514,0.974,0.708,2.057,0.597,3.119L29.744,18.748zM21.057,17.867c-0.297,0.629-0.717,1.215-1.266,1.712c-2.236,2.028-5.692,1.86-7.719-0.378c-2.027-2.237-1.86-5.695,0.377-7.723c0.85-0.771,1.876-1.222,2.933-1.365l0.005-8.575c-3.111,0.162-6.188,1.354-8.676,3.612c-5.728,5.198-6.16,14.06-0.964,19.792c5.195,5.729,14.052,6.164,19.781,0.964c1.699-1.543,2.92-3.409,3.679-5.418L21.057,17.867z",
        NodeType: nodes.PieChart,
        OptionsTemplateUrl: tools.TemplatesFolder + "PieChart.html"
    });
    instance.MaxInputs = 1;
    instance.AllowImageExport = true;
    instance.HelpUrl = "http://querytreeapp.com/help/tools/pie-chart/";

    return instance;
};

tools.Summarize = function () {
    var instance = new tools.ToolBase({
        Name: "Summarize",
        Title: "Summarize",
        Visible: true,
        Description: "Displays the statistics for the connected source table2",
        SymbolPath: "M22.646,19.307c0.96-1.583,1.523-3.435,1.524-5.421C24.169,8.093,19.478,3.401,13.688,3.399C7.897,3.401,3.204,8.093,3.204,13.885c0,5.789,4.693,10.481,10.484,10.481c1.987,0,3.839-0.563,5.422-1.523l7.128,7.127l3.535-3.537L22.646,19.307zM13.688,20.369c-3.582-0.008-6.478-2.904-6.484-6.484c0.006-3.582,2.903-6.478,6.484-6.486c3.579,0.008,6.478,2.904,6.484,6.486C20.165,17.465,17.267,20.361,13.688,20.369zM15.687,9.051h-4v2.833H8.854v4.001h2.833v2.833h4v-2.834h2.832v-3.999h-2.833V9.051z",
        NodeType: nodes.Summarize,
        OptionsTemplateUrl: tools.TemplatesFolder + "Summarize.html"
    });

    instance.AggFunctions = ko.observableArray([
        { id: 1, text: "Number of Rows", requiresNumeric: false },
        { id: 2, text: "Total", requiresNumeric: true },
        { id: 3, text: "Minimum", requiresNumeric: true },
        { id: 4, text: "Maximum", requiresNumeric: true },
        { id: 5, text: "Average", requiresNumeric: true },
        { id: 6, text: "Median", requiresNumeric: true }
    ]);

    instance.DateFunctions = ko.observableArray([
        { id: 1, text: "Date" },
        { id: 2, text: "Month" },
        { id: 3, text: "Year" },
    ]);

    instance.MaxInputs = 1;
    instance.HelpUrl = "http://querytreeapp.com/help/tools/statistics/";

    return instance;
};

tools.Extract = function () {
    var instance = new tools.ToolBase({
        Name: "Extract",
        Title: "Extract",
        Visible: true,
        Description: "Makes a new column by extracting text from within another column",
        SymbolPath: "M14.505,5.873c-3.937,2.52-5.904,5.556-5.904,9.108c0,1.104,0.192,1.656,0.576,1.656l0.396-0.107c0.312-0.12,0.563-0.18,0.756-0.18c1.128,0,2.07,0.411,2.826,1.229c0.756,0.82,1.134,1.832,1.134,3.037c0,1.157-0.408,2.14-1.224,2.947c-0.816,0.807-1.801,1.211-2.952,1.211c-1.608,0-2.935-0.661-3.979-1.984c-1.044-1.321-1.565-2.98-1.565-4.977c0-2.259,0.443-4.327,1.332-6.203c0.888-1.875,2.243-3.57,4.067-5.085c1.824-1.514,2.988-2.272,3.492-2.272c0.336,0,0.612,0.162,0.828,0.486c0.216,0.324,0.324,0.606,0.324,0.846L14.505,5.873zM27.465,5.873c-3.937,2.52-5.904,5.556-5.904,9.108c0,1.104,0.192,1.656,0.576,1.656l0.396-0.107c0.312-0.12,0.563-0.18,0.756-0.18c1.104,0,2.04,0.411,2.808,1.229c0.769,0.82,1.152,1.832,1.152,3.037c0,1.157-0.408,2.14-1.224,2.947c-0.816,0.807-1.801,1.211-2.952,1.211c-1.608,0-2.935-0.661-3.979-1.984c-1.044-1.321-1.565-2.98-1.565-4.977c0-2.284,0.449-4.369,1.35-6.256c0.9-1.887,2.256-3.577,4.068-5.067c1.812-1.49,2.97-2.236,3.474-2.236c0.336,0,0.612,0.162,0.828,0.486c0.216,0.324,0.324,0.606,0.324,0.846L27.465,5.873z",
        NodeType: nodes.Extract,
        OptionsTemplateUrl: tools.TemplatesFolder + "Extract.html"
    });
    instance.MaxInputs = 1;

    instance.StartTypes = ko.observableArray([
        { id: 1, text: "The beginning" },
        { id: 2, text: "At a specific position" },
        { id: 3, text: "At the first occurrence of..." },
        { id: 4, text: "After the first occurrence of..." },
    ]);

    instance.EndTypes = ko.observableArray([
        { id: 1, text: "The end" },
        { id: 2, text: "At a specific position" },
        { id: 3, text: "At a specific length" },
        { id: 4, text: "At the next occurrence of..." },
        { id: 5, text: "After the next occurrence of..." },
    ]);

    instance.HelpUrl = "http://querytreeapp.com/help/tools/extract/";

    return instance;
}

tools.IsNumericType = function (theType) {
    switch (theType.toUpperCase()) {
        case "INTEGER":
        case "INT":
        case "SMALLINT":
        case "TINYINT":
        case "MEDIUMINT":
        case "BIGINT":
        case "DECIMAL":
        case "NUMERIC":
        case "FLOAT":
        case "DOUBLE":
        case "REAL":
        case "MONEY":
        case "SMALLMONEY":
        case "DOUBLE PRECISION":
        case "SMALLSERIAL":
        case "SERIAL": 
        case "BIGSERIAL":
        case "INT4":
        case "INT8":
            return true;
        default:
            return false;
    }
}

tools.IsDatetimeType = function (theType) {
    switch (theType.toUpperCase()) {
        case "DATE":
        case "DATETIME":
        case "DATETIME2":
        case "TIME":
        case "TIMESTAMP":
        case "TIMESTAMP WITHOUT TIME ZONE":
        case "TIMESTAMP WITH TIME ZONE":
        case "DATE":
        case "TIME WITHOUT TIME ZONE":
        case "TIME WITH TIME ZONE":
        case "INTERVAL":
            return true;
        default:
            return false;
    }
}

tools.IsTextType = function (theType) {
    switch (theType.toUpperCase()) {
        case "VARCHAR":
        case "NVARCHAR":
        case "CHAR":
        case "NCHAR":
        case "TEXT":
        case "NTEXT":
        case "XML":
        case "UNIQUEIDENTIFIER":
        case "BINARY":
        case "VARBINARY":
        case "IMAGE":
        case "ENUM":
        case "CHARACTER VARYING":
        case "CHARACTER":
        case "TEXT":
        case "LONGTEXT":
        case "USER-DEFINED": // Treat any user defined columns as text
            return true;
        default:
            return false;
    }
}
