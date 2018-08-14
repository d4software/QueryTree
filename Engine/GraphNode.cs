using System;
using Newtonsoft.Json;
using System.Collections.Generic;

namespace QueryTree.Engine
{
    public class GraphNode : DataProcessorNode
    {
        private string HorizontalAxis;
        private string Values1;
        private IList<int> DataSeriesColumnIndexes;
        private string NodeType;
        
        public override void UpdateSettings(Dictionary<string, object> settings)
        {
            base.UpdateSettings(settings);

            if (settings.ContainsKey("HorizontalAxis"))
            {
                HorizontalAxis = (string)settings["HorizontalAxis"];
            }
                
            if (settings.ContainsKey("Values1"))
            {
                Values1 = (string)settings["Values1"];
            }

            if (settings.ContainsKey("DataSeriesColumnIndexes"))
            {
                DataSeriesColumnIndexes = JsonConvert.DeserializeObject<List<int>>(settings["DataSeriesColumnIndexes"].ToString());
            }

            if (settings.ContainsKey("Type"))
            {
                NodeType = (string)settings["Type"];
            }
        }

        public override IList<string> GetColumns()
        {
            var newCols = new List<string>();

            if (InputDict.Count > 0)
            {
                var input1 = InputDict[Inputs[0]];
                var input1Cols = input1.GetColumns();

                if (HorizontalAxis != null && input1Cols.Contains(HorizontalAxis))
                {
                    newCols.Add(HorizontalAxis);
                }

                if (DataSeriesColumnIndexes.Count == 0 && Values1 != null && input1Cols.Contains(Values1))
                {
                    DataSeriesColumnIndexes = new List<int> { input1Cols.IndexOf(Values1) };
                }

                foreach (var colIndex in DataSeriesColumnIndexes)
                {
                    if (colIndex < input1Cols.Count)
                    {
                        newCols.Add(input1Cols[colIndex]);
                    }
                }
            }
            
            return newCols;
        }

        public override IList<string> GetColumnTypes()
        {
            var newColTypes = new List<string>();

            if (InputDict.Count > 0)
            {
                var input1 = InputDict[Inputs[0]];
                var input1Cols = input1.GetColumns();
                var input1ColTypes = input1.GetColumnTypes();

                if (HorizontalAxis != null && input1Cols.Contains(HorizontalAxis))
                {
                    newColTypes.Add(input1ColTypes[input1Cols.IndexOf(HorizontalAxis)]);
                }

                if (DataSeriesColumnIndexes.Count == 0 && Values1 != null)
                {
                    DataSeriesColumnIndexes = new List<int>() { input1Cols.IndexOf(Values1) };
                }

                foreach (var colIndex in DataSeriesColumnIndexes)
                {
                    if (colIndex < input1ColTypes.Count)
                    {
                        newColTypes.Add(input1ColTypes[colIndex]);
                    }
                }
            }

            return newColTypes;
        }

        public override string GetQuerySql()
        {
            if (NodeType == "Line Chart")
            {
                SortColumnIndexes = new List<int>() { GetColumns().IndexOf(HorizontalAxis) };
            }
            
			var input1 = InputDict[Inputs[0]];
			var input1Cols = input1.GetColumns();
            var input1ColTypes = input1.GetColumnTypes();

            var sql = string.Format("SELECT Column_{0:D} AS Column_0", input1Cols.IndexOf(HorizontalAxis));
            var colCount = 1;
            var separator = ",";

            if (DataSeriesColumnIndexes.Count == 0 && Values1 != null)
            {
                DataSeriesColumnIndexes = new List<int>() { input1Cols.IndexOf(Values1) };
            }

            foreach (var colIndex in DataSeriesColumnIndexes)
            {
                if (colIndex < input1Cols.Count)
                {
                    sql += string.Format("{0}Column_{1:D} AS Column_{2:D}", separator, colIndex, colCount);

                    colCount += 1;

                    separator = ",";
                }
            }

            sql += string.Format(" FROM {0}", input1.GetDependencySql());

            return sql;
        }

        public override bool IsConfigured()
        {
            var columns = GetColumns();
            return Inputs.Count == 1 && columns.Count > 0 && columns.Contains(HorizontalAxis);
        }
    }
}
