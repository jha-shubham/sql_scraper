#!/bin/bash
echo "CREATE DATABASE IF NOT EXISTS cbt; use cbt;" >> master.sql 
cat railsapp*.sql  >> master.sql
rm railsapp*.sql bkp_script.sh