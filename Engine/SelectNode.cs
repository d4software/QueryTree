using System;
using Newtonsoft.Json;
using System.Collections.Generic;

namespace QueryTree.Engine
{
    public class SelectNode : DataProcessorNode
    {
        private IList<int> IncludedColumnIndexes;
        private IList<string> ColumnAliases;

        public override void UpdateSettings(Dictionary<string, object> settings)
        {
            IncludedColumnIndexes = new List<int>();
            ColumnAliases = new List<string>();

            base.UpdateSettings(settings);

            if (settings.ContainsKey("IncludedColumnIndexes") && settings["IncludedColumnIndexes"] != null)
            {
                IncludedColumnIndexes = JsonConvert.DeserializeObject<List<int>>(settings["IncludedColumnIndexes"].ToString());
            }

            if (settings.ContainsKey("ColumnAliases") && settings["ColumnAliases"] != null)
            {
                ColumnAliases = JsonConvert.DeserializeObject<List<string>>(settings["ColumnAliases"].ToString());
            }
        }

        public override bool IsConfigured()
        {
            return Inputs.Count == 1
                //&& len(self.columns) > 0 
                && IncludedColumnIndexes.Count > 0;
        }

        public override IList<string> GetColumns()
        {
            var newCols = new List<string>();
            var inputCols = InputDict[Inputs[0]].GetColumns();

            foreach (var colIndex in IncludedColumnIndexes)
            {
                if (colIndex < inputCols.Count)
                {
                    newCols.Add(inputCols[colIndex]);

                    var i = newCols.Count - 1;

                    if (ColumnAliases.Count > i && ColumnAliases[i] != null)
                    {
                        newCols[i] = ColumnAliases[i];
                    }
                }
            }
            return newCols;
        }

        public override IList<string> GetColumnTypes()
        {
            var newColTypes = new List<string>();
            var inputColTypes = InputDict[Inputs[0]].GetColumnTypes();

            foreach (var colIndex in IncludedColumnIndexes)
            {
                if (colIndex < inputColTypes.Count)
                {
                    newColTypes.Add(inputColTypes[colIndex]);
                }
            }

            return newColTypes;
        }

        public override string GetQuerySql()
        {
            var input1 = InputDict[Inputs[0]];
            var input1Columns = input1.GetColumns();
            var sql = "SELECT ";
            var colCount = 0;
            var separator = "";

            foreach (var colIndex in IncludedColumnIndexes)
            {
                if (colIndex < input1Columns.Count)
                {
                    if (input1 is ICollapsibleQueryNode)
                    {
                        sql += string.Format("{0}{1} AS Column_{2:D}", separator, (input1 as ICollapsibleQueryNode).GetRawColumnName(colIndex), colCount);
                    }
                    else
                    {
                        sql += string.Format("{0}{1} AS Column_{2:D}", separator, input1.GetColumnName(colIndex), colCount);
                    }

                    colCount += 1;
                    separator = ",";
                }
            }

            if (input1 is ICollapsibleQueryNode)
            {
                sql += (input1 as ICollapsibleQueryNode).GetTableFrom();
            }
            else
            {
                sql += string.Format(" FROM {0} ", input1.GetDependencySql());
            }

            return sql;
        }
    }
}
