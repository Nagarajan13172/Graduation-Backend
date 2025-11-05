// Test script to verify getOrderByOrderId endpoint
const db = require('./src/db');

// Sample orderid to test with
const testOrderId = '5C18174777704880AD37B799E8F91C56';

console.log('=== Testing Get Order By OrderID ===');
console.log('OrderID:', testOrderId);
console.log('');

const query = `
  SELECT 
    id,
    full_name,
    date_of_birth,
    gender,
    guardian_name,
    nationality,
    religion,
    email,
    mobile_number,
    place_of_birth,
    community,
    mother_tongue,
    aadhar_number,
    degree_name,
    university_name,
    degree_pattern,
    convocation_year,
    is_registered_graduate,
    occupation,
    address,
    lunch_required,
    companion_option,
    orderid,
    payment_status,
    bdorderid,
    transaction_id,
    payment_amount,
    payment_date,
    payment_method_type,
    payment_bank_ref,
    payment_error_code,
    payment_error_desc,
    receipt_number,
    receipt_generated_at,
    created_at,
    updated_at
  FROM students 
  WHERE orderid = ?
`;

db.get(query, [testOrderId], (err, row) => {
    if (err) {
        console.error('Database error:', err);
        db.close();
        return;
    }

    if (!row) {
        console.log('❌ Order not found');
        db.close();
        return;
    }

    // Structure the response
    const response = {
        success: true,
        orderid: row.orderid,

        // Personal Information
        personal_info: {
            full_name: row.full_name,
            date_of_birth: row.date_of_birth,
            gender: row.gender,
            guardian_name: row.guardian_name,
            nationality: row.nationality,
            religion: row.religion,
            email: row.email,
            mobile_number: row.mobile_number,
            place_of_birth: row.place_of_birth,
            community: row.community,
            mother_tongue: row.mother_tongue,
            aadhar_number: row.aadhar_number
        },

        // Academic Information
        academic_info: {
            degree_name: row.degree_name,
            university_name: row.university_name,
            degree_pattern: row.degree_pattern,
            convocation_year: row.convocation_year,
            is_registered_graduate: row.is_registered_graduate === 1
        },

        // Additional Information
        additional_info: {
            occupation: row.occupation,
            address: row.address,
            lunch_required: row.lunch_required,
            companion_option: row.companion_option
        },

        // Transaction Information
        transaction_info: {
            payment_status: row.payment_status,
            bdorderid: row.bdorderid,
            transaction_id: row.transaction_id,
            payment_amount: row.payment_amount,
            payment_date: row.payment_date,
            payment_method_type: row.payment_method_type,
            payment_bank_ref: row.payment_bank_ref,
            payment_error_code: row.payment_error_code,
            payment_error_desc: row.payment_error_desc,
            receipt_number: row.receipt_number,
            receipt_generated_at: row.receipt_generated_at
        },

        // Metadata
        metadata: {
            student_id: row.id,
            created_at: row.created_at,
            updated_at: row.updated_at
        }
    };

    console.log('✅ Order Found!');
    console.log('');
    console.log('=== API Response (JSON) ===');
    console.log(JSON.stringify(response, null, 2));
    console.log('');
    console.log('=== Summary ===');
    console.log('Student Name:', response.personal_info.full_name);
    console.log('Email:', response.personal_info.email);
    console.log('Mobile:', response.personal_info.mobile_number);
    console.log('Payment Status:', response.transaction_info.payment_status);
    console.log('Amount:', response.transaction_info.payment_amount);
    console.log('');
    console.log('=== Test Complete ===');

    db.close();
});
