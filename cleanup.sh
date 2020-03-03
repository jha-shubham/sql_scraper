#!/bin/bash
echo "CREATE DATABASE IF NOT EXISTS zombie; use zombie;" > master.sql 
cat zombie*.sql  >> master.sql

echo "CREATE DATABASE IF NOT EXISTS cbt; use cbt;" >> master.sql 
cat railsapp*.sql  >> master.sql

rm zombie*.sql railsapp*.sql bkp_script.sh