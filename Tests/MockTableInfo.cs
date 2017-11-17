using System;
using System.Collections.Generic;
using QueryTree.Engine;

namespace QueryTree.Engine.Tests
{
    public class MockTableInfo : ITableInfo
    {
        public string DisplayName { get; set; }
        public IList<IColumnInfo> Columns { get; set; }
    }

    public class MockColumnInfo : IColumnInfo
    {
        public string Name { get; set; }
        public string DataType { get; set; }
    }
}
