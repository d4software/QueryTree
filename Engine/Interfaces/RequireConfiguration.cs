using System;
using System.Collections.Generic;

namespace QueryTree.Engine
{
    /// <summary>
    /// Provides methods necessary for a dependant node to de-construct this
    /// node's query into component parts, so it can collapse the two queries
    /// together
    /// </summary>
    internal interface IRequireConfiguration
    {
        void Configure(IList<ITableInfo> tables);
    }
}
