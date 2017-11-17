﻿using System;
namespace QueryTree.Engine
{
    public interface IColumnInfo
    {
        string Name
        {
            get;
            set;
        }

        string DataType
        {
            get;
            set;
        }
    }
}
