using System;
using Newtonsoft.Json;
using System.Linq;
using System.Collections.Generic;

namespace QueryTree.Engine
{
    public enum AggregationFunction
    {
        Count = 1,
        Total,
        Minimum,
        Maximum,
        Average,
        Median
    }

    public enum GroupByFunction
    {
        Date = 1,
        Month,
        Year
    }

    public class SummarizeNode : DataProcessorNode
    {
        private IList<int> GroupByColumnIndexes;
        private IList<int> AggColumnIndexes;
        private IList<GroupByFunction?> GroupByFunctions;
        private IList<AggregationFunction> AggFunctions;

        public override void UpdateSettings(Dictionary<string, object> settings)
        {
            base.UpdateSettings(settings);
            if (settings.ContainsKey("GroupByColumnIndexes"))
            {
                GroupByColumnIndexes = JsonConvert.DeserializeObject<List<int>>(settings["GroupByColumnIndexes"].ToString());
            }
            else
            {
                GroupByColumnIndexes = new List<int>();
            }

            if (settings.ContainsKey("GroupByFunctions"))
            {
                GroupByFunctions = JsonConvert.DeserializeObject<List<GroupByFunction?>>(settings["GroupByFunctions"].ToString());
            }
            else
            {
                GroupByFunctions = new List<GroupByFunction?>();
            }

            if (settings.ContainsKey("AggFunctions"))
            {
                AggFunctions = JsonConvert.DeserializeObject<List<AggregationFunction>>(settings["AggFunctions"].ToString());
            }

            if (settings.ContainsKey("AggColumnIndexes"))
            {
                AggColumnIndexes = JsonConvert.DeserializeObject<List<int>>(settings["AggColumnIndexes"].ToString());
            }
        }

        public override bool IsConfigured()
        {
            return Inputs.Count == 1
                && AggFunctions.Count > 0
                && (AggFunctions.All(f => f == AggregationFunction.Count) || AggColumnIndexes.Count > 0);
        }

        private string GetAggFunctionUIText(string columnName, AggregationFunction aggFunction)
        {
            switch (aggFunction)
            {
                case AggregationFunction.Count:
                    return "Count";
                case AggregationFunction.Total:
                    return "Total " + columnName;
                case AggregationFunction.Minimum:
                    return "Minimum " + columnName;
                case AggregationFunction.Maximum:
                    return "Maximum " + columnName;
                case AggregationFunction.Average:
                    return "Average " + columnName;
                case AggregationFunction.Median:
                    return "Median " + columnName;
                default:
                    return columnName;
            }
        }

        private string GetGroupByFunctionUIText(string columnName, GroupByFunction? groupByFunction)
        {
            if (groupByFunction != null)
            {
                if (groupByFunction == GroupByFunction.Month)
                {
                    return columnName + " Month";
                }
                else if (groupByFunction == GroupByFunction.Year)
                {
                    return columnName + " Year";
                }
            }

            return columnName;
        }

        public string GetAggStr(int columnIndex, AggregationFunction aggFunction)
        {
            switch (aggFunction)
            {
                case AggregationFunction.Count:
                    return "COUNT(*)";
                case AggregationFunction.Total:
                    return string.Format("SUM(Column_{0:D})", columnIndex);
                case AggregationFunction.Minimum:
                    return string.Format("MIN(Column_{0:D})", columnIndex);
                case AggregationFunction.Maximum:
                    return string.Format("MAX(Column_{0:D})", columnIndex);
                case AggregationFunction.Median:
                case AggregationFunction.Average:
                    return string.Format("AVG(Column_{0:D})", columnIndex);
                default:
                    return string.Format("Column_{0:D}", columnIndex);
            }
        }

        private string GetGroupByStr(int columnIndex, GroupByFunction groupByFunction)
        {
            if (groupByFunction == GroupByFunction.Month)
            {
                return string.Format("Month(Column_{0:D})", columnIndex);
            }
            else if (groupByFunction == GroupByFunction.Year)
            {
                return string.Format("Year(Column_{0:D})", columnIndex);
            }
            else
            {
                return string.Format("Column_{0:D}", columnIndex);
            }
        }

        private string GetGroupByType(string columnType, GroupByFunction groupByFunction)
        {
            if (groupByFunction == GroupByFunction.Month || groupByFunction == GroupByFunction.Year)
            {
                return "int";
            }
            else
            {
                return columnType;
			}
        }

        public override IList<string> GetColumns()
        {
            var columns = new List<string>();

            if (Inputs.Count > 0)
            {
                var input1 = InputDict[Inputs[0]];
                var input1Cols = input1.GetColumns();

                for (var i = 0; i < GroupByColumnIndexes.Count; i++)
                {
                    var columnName = input1Cols[GroupByColumnIndexes[i]];

                    if (i < GroupByFunctions.Count)
                    {
                        columns.Add(GetGroupByFunctionUIText(columnName, GroupByFunctions[i]));
                    }
                }

                for (int i = 0; i < AggColumnIndexes.Count; i++)
                {
                    string columnName = input1Cols[AggColumnIndexes[i]];

                    if (i < AggFunctions.Count)
                    {
                        columns.Add(GetAggFunctionUIText(columnName, AggFunctions[i]));
                    }
                }
            }

            return columns;
        }
		
        public override IList<string> GetColumnTypes()
        {
            var colTypes = new List<string>();

            var input1 = InputDict[Inputs[0]];
            var input1ColTypes = input1.GetColumnTypes();

            for (var i = 0; i < GroupByColumnIndexes.Count; i++)
            {
                GroupByFunction groupByFunction = GroupByFunction.Date;

                if (i < GroupByFunctions.Count && GroupByFunctions[i].HasValue)
                {
                    groupByFunction = GroupByFunctions[i].Value;
                }

                var colIndex = GroupByColumnIndexes[i];

                if (colIndex < input1ColTypes.Count)
                {
                    var colType = GetGroupByType(input1ColTypes[colIndex], groupByFunction);
                    colTypes.Add(colType);
                }
            }

            for (var i = 0; i < AggColumnIndexes.Count; i++)
            {
                colTypes.Add("double");
            }

            return colTypes;
        }

        public override string GetQuerySql()
        {
            var input1 = InputDict[Inputs[0]];
            var selectCols = new List<string>();
            var groupByCols = new List<string>();

            for (var i = 0; i < GroupByColumnIndexes.Count; i++)
            {
                GroupByFunction groupByFunction = GroupByFunction.Date;

                if (i < GroupByFunctions.Count && GroupByFunctions[i].HasValue)
                {
                    groupByFunction = GroupByFunctions[i].Value;
                }

                var groupByStr = GetGroupByStr(GroupByColumnIndexes[i], groupByFunction);

                selectCols.Add(string.Format("{0} AS Column_{1:D}", groupByStr, selectCols.Count));

                groupByCols.Add(groupByStr);
            }

            for (var i = 0; i < AggFunctions.Count; i++)
            {
                AggregationFunction aggFunction = AggregationFunction.Count;

                if (i < AggFunctions.Count)
                {
                    aggFunction = AggFunctions[i];
                }

                var aggStr = GetAggStr(
                    aggFunction != AggregationFunction.Count ? AggColumnIndexes[i] : 0, 
                    aggFunction);

                selectCols.Add(string.Format("{0} AS Column_{1:D}", aggStr, selectCols.Count));
            }

            var sql = string.Format("SELECT {0} FROM {1}", String.Join(",", selectCols), input1.GetDependencySql());

            if (GroupByColumnIndexes.Count > 0)
            {
                sql += string.Format(" GROUP BY {0}", String.Join(",", groupByCols));
            }

            return sql;
        }
    }
}
