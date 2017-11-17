using System;
using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json;

namespace QueryTree.Engine
{
    public class SortNode : DataProcessorNode
    {
        private List<string> SortColumns;

        public override void UpdateSettings(Dictionary<string, object> settings)
        {
            base.UpdateSettings(settings);

            if (settings.ContainsKey("SortColumns"))
            {
                SortColumns = JsonConvert.DeserializeObject<List<string>>(settings["SortColumns"].ToString());
            }

            if (settings.ContainsKey("SortDirections"))
            {
                SortDirections = JsonConvert.DeserializeObject<List<bool>>(settings["SortDirections"].ToString());
            }
        }

        public override string GetQuerySql()
        {
            var columns = GetColumns();
            SortColumnIndexes = SortColumns.Select(c => columns.IndexOf(c)).ToList();

            var firstInput = InputDict[Inputs[0]];

            var sql = string.Format("SELECT * FROM {0}", firstInput.GetDependencySql());

            return sql;
        }

        public override bool IsConfigured()
        {
            return Inputs.Any() && GetColumns().Any();
        }
    }
}
