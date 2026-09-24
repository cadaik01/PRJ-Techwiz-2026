"""
MarketLink Core Package Initialization.
Emulates mysqlclient using PyMySQL for seamless MySQL 8.x connectivity.
"""

try:
    import pymysql
    pymysql.version_info = (2, 2, 1, 'final', 0)
    pymysql.install_as_MySQLdb()
except ImportError:
    pass
