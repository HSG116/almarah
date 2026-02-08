-- Initial Site Settings
INSERT INTO site_settings (key, value) VALUES 
('store_status', '"open"'),
('working_hours', '{"saturday":{"from":"08:00","to":"23:00","closed":false},"sunday":{"from":"08:00","to":"23:00","closed":false},"monday":{"from":"08:00","to":"23:00","closed":false},"tuesday":{"from":"08:00","to":"23:00","closed":false},"wednesday":{"from":"08:00","to":"23:00","closed":false},"thursday":{"from":"08:00","to":"23:00","closed":false},"friday":{"from":"13:00","to":"22:00","closed":false}}'),
('legal_terms', '"سيتم إضافة شروط الاستخدام هنا..."'),
('legal_privacy', '"سيتم إضافة سياسة الخصوصية هنا..."'),
('legal_copyright', '"© 2026 ملحمة النعيمي الفاخر. جميع الحقوق محفوظة."'),
('contact_details', '{"whatsapp":"0501234567","email":"info@alnaemi.com","tax_number":"300012345600003","store_name":"ملحمة النعيمي الفاخر"}')
ON CONFLICT (key) DO NOTHING;
