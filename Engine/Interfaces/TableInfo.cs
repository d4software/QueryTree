﻿using System;
using System.Collections.Generic;

namespace QueryTree.Engine
{
    public interface ITableInfo
    {
        string DisplayName
        {
            get;
            set;
        }

        IList<IColumnInfo> Columns
        {
            get;
            set;
        }
    }
}
