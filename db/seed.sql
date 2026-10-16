INSERT INTO dim_vendor (vendor_id, vendor_name) VALUES
(1, 'Creative Mobile Technologies, LLC'),
(2, 'Curb Mobility, LLC'),
(6, 'Myle Technologies Inc');

INSERT INTO dim_rate_code (rate_code_id, rate_code_name, rate_category) VALUES
(1, 'Standard rate', 'Standard'),
(2, 'JFK', 'Airport'),
(3, 'Newark', 'Airport'),
(4, 'Nassau or Westchester', 'Special'),
(5, 'Negotiated fare', 'Special'),
(6, 'Group ride', 'Special'),
(99, 'Null/unknown', 'Unknown');

INSERT INTO dim_payment_type (payment_type_id, payment_name, payment_category) VALUES
(0, 'Flex Fare trip', 'Electronic'),
(1, 'Credit card', 'Electronic'),
(2, 'Cash', 'Cash'),
(3, 'No charge', 'Non-Paying'),
(4, 'Dispute', 'Non-Paying'),
(5, 'Unknown', 'Unknown'),
(6, 'Voided trip', 'Non-Paying');