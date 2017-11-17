using System;
using System.Collections.Generic;

namespace QueryTree.ViewModels
{
    public class QueryResponse
    {
        public QueryResponse()
        {
			Columns = new List<string>();
			ColumnTypes = new List<string>();
            Rows = new List<IList<object>>();
        }

        public string Status { get; set; }
        public string ErrorText { get; set; }
        public IList<string> Columns { get; set; }
        public IList<string> ColumnTypes { get; set; }
        public IList<IList<object>> Rows { get; set; }
        public long RowCount { get; set; }
        public string Query { get; set; }
    }
}
