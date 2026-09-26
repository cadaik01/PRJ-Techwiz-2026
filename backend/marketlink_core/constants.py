# U-01: D-013 says "the next N days"; the resolved value is 7.
# Bounds how far ahead a customer may book a pickup, and therefore which market and
# farmer closures count as "upcoming" in MarketSummary and FarmerSummary (D-023).
BOOKING_HORIZON_DAYS = 7

# Image upload ceiling shown to the frontend (PU-01) and enforced on every upload field.
MAX_UPLOAD_MB = 2

# D-005 cap on unapproved PLACED orders per customer. The Farmer branch owns the
# MAX_PLACED_ORDERS_PER_CUSTOMER setting; this is the value to fall back on until it lands.
MAX_PLACED_ORDERS_PER_CUSTOMER = 10
