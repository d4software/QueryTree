using System;
using System.Collections.Generic;

namespace QueryTree.Engine
{
    public abstract class DataSourceNode : NodeBase
    {
		protected IList<string> Columns { get; set; }
		protected IList<string> ColumnTypes { get; set; }

        public override IList<string> GetColumns()
        {
            return Columns;
        }

        public override IList<string> GetColumnTypes()
        {
            return ColumnTypes;
        }
    }
}
