import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rfwnclhnxhatnybxjlhm.supabase.co';
const supabaseKey = 'sb_publishable_PNypnTlPQNQSmDjyL0DUsg_NiaV6Pmp';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateImagePositions() {
    console.log('🔄 تحديث موضع الصورة للمنتجات...');

    // تحديث "خروف حري كامل"
    const { data: data1, error: error1 } = await supabase
        .from('products')
        .update({ image_object_position: 'object-top' })
        .eq('name', 'خروف حري كامل');

    if (error1) {
        console.error('❌ خطأ في تحديث خروف حري كامل:', error1);
    } else {
        console.log('✅ تم تحديث "خروف حري كامل" بنجاح');
    }

    // تحديث "تيس بلدي محايل"
    const { data: data2, error: error2 } = await supabase
        .from('products')
        .update({ image_object_position: 'object-top' })
        .eq('name', 'تيس بلدي محايل');

    if (error2) {
        console.error('❌ خطأ في تحديث تيس بلدي محايل:', error2);
    } else {
        console.log('✅ تم تحديث "تيس بلدي محايل" بنجاح');
    }

    console.log('✨ تم الانتهاء من التحديث!');
    process.exit(0);
}

updateImagePositions();
