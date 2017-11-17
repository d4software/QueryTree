using System;
using System.Text;
using System.Collections.Generic;
using System.Linq;

namespace QueryTree.Engine
{
    public class AppendNode : DataProcessorNode
    {
        private bool IncludeUniqueColumns;

        public override void UpdateSettings(Dictionary<string, object> settings)
        {
            base.UpdateSettings(settings);

            if (settings.ContainsKey("IncludeUniqueColumns"))
            {
                IncludeUniqueColumns = (bool)settings["IncludeUniqueColumns"];
            }
        }

        public override bool IsConfigured()
        {
            var columns = GetColumns();
            return Inputs.Count > 0 && columns.Count > 0;
        }

        public override string GetQuerySql()
        {
            var sql = new StringBuilder();
            var selectSeparator = "";
            var colCount = 0;
            var columns = GetColumns();

            foreach (var inputId in Inputs)
            {
                var input = InputDict[inputId];
                var inputCols = input.GetColumns();

                sql.Append(selectSeparator + "SELECT ");

                var columnSeparator = "";

                foreach (var column in columns)
                {
                    if (inputCols.Contains(column))
                    {
                        sql.AppendFormat("{0}{1}.Column_{2:D} AS Column_{3:D}", columnSeparator, input.GetNodeAlias(), inputCols.IndexOf(column), colCount);
                    }
                    else
                    {
                        sql.AppendFormat("{0}NULL AS Column_{1:D}", columnSeparator, colCount);
                    }

                    colCount += 1;
                    columnSeparator = ",";
                }

                selectSeparator = " UNION ALL ";

                sql.AppendFormat(" FROM {0}", input.GetDependencySql());
            }

            return sql.ToString();
        }

        public override IList<string> GetColumns()
        {
            var safeGetColumns = new Func<string, IList<string>>(nodeId =>
            {
                if (InputDict.ContainsKey(nodeId))
                {
                    return InputDict[nodeId].GetColumns();
                }
                else
                {
                    return new List<string>();
                }
            });

            var columnLists = Inputs.Select(i => safeGetColumns(i));

            if (columnLists.Any())
            {
                if (IncludeUniqueColumns)
                {
					// build a full column list from all inputs
					return columnLists.Aggregate((x, y) => new List<string>(new HashSet<string>(x).Union(y)));
                }
                else
                {
                    // build an intersection of the column lists from all inputs
                    return columnLists.Aggregate((x, y) => new List<string>(new HashSet<string>(x).Intersect(y)));
                }
            }
            else
            {
                return new List<string>();
            }
        }

        public override IList<string> GetColumnTypes()
        {
            var result = new List<string>();

            foreach (var column in GetColumns())
            {
                foreach (var inputId in Inputs)
                {
                    var input = InputDict[inputId];
                    var inputCols = input.GetColumns();

                    if (inputCols.Contains(column))
                    {
                        var columnIndex = inputCols.IndexOf(column);

                        result.Add(input.GetColumnTypes()[columnIndex]);

                        break;
                    }
                }
            }

            return result;
        }
    }
}
