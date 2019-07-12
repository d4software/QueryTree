# Auto-Join

When a table is selected in the query builder, QueryTree checks for other tables that it can automatically join onto and prompts the user to select those related tables, thereby including the columns from the related table in the results that are returned.

QueryTree can automatically join from "child" tables onto "parent" tables, but not the other way around. For example, if the user selected the "Orders" table, QueryTree could auto-join onto "Users" or "Products". But selecting "Users" will not prompt you to include information from the "Orders" table.

This limitation is primarily for usability, not a technical reasons. The level of user that QueryTree is aimed at, generally seem to understand the idea of selecting Orders and then adding in the related User or Product information. However, if QueryTree were to join from Users onto Orders, the QueryTree user would see the User information repeated multiple times, in our experience, this causes confusion.

There are two ways to tell QueryTree how to join between tables.

## Foreign Keys

The most robust way to tell QueryTree how to join between tables is to create a foreign key relationship between the tables. 

For example, given the following two tables, QueryTree will prompt to join from "orders" to "users".

```sql
create table users
(
  id         int not null primary key,
  first_name varchar(250) null,
  last_name  varchar(250) null,
  dob        date null
);

create table orders
(
  id         int not null primary key,
  orderer    int not null,
  order_date date null,
  total      decimal null,
  constraint orders_users_fk
  foreign key (orderer) references users (id)
);
```

Foreign keys on to compound (multiple column) keys are not supported.

## Naming Convention

In addition to looking for foreign keys, QueryTree will look for columns on the selected table, that:

* Are not the primary key
* Are not already part of a foreign key
* Match the name of another table, followed by the letters "_id" or "id". This check is not case sensitive.

For example, given the following two tables, QueryTree will prompt to join from "orders" to "users". Despite the fact that there are no foreign keys.

```sql
create table users
(
  id         int not null primary key,
  first_name varchar(250) null,
  last_name  varchar(250) null,
  dob        date null
);

create table orders
(
  id         int not null primary key,
  usersid    int not null,
  order_date date null,
  total      decimal null
);
```

## Caching

QueryTree will interrogate the structure of your database the first time it is queried, and cache the information for an hour. If you change the database structure and want to see the effects immidiately, please restart the QueryTree process to flush the cache.
