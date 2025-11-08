'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../../../lib/supabase';
import { useRouter } from 'next/navigation';
import { Employee, Department } from '../../../../../types/database';
import { logEmployeeCreated, logEmployeeUpdated } from '../../../../../lib/activity-logger';

export default function AddEmployeePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [nextEmpId, setNextEmpId] = useState<string>('1044');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [existingEmployeeId, setExistingEmployeeId] = useState<string | null>(null);
  
  // Form fields as state
  const [empId, setEmpId] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [fatherGuardianName, setFatherGuardianName] = useState<string>('');
  const [fatherGuardianOccupation, setFatherGuardianOccupation] = useState<string>('');
  const [fatherGuardianRelation, setFatherGuardianRelation] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [socialAddress, setSocialAddress] = useState<string>('');
  const [empCnic, setEmpCnic] = useState<string>('');
  const [empCellNo, setEmpCellNo] = useState<string>('');
  const [fatherGuardianCnic, setFatherGuardianCnic] = useState<string>('');
  const [fatherGuardianCellNo, setFatherGuardianCellNo] = useState<string>('');
  const [dob, setDob] = useState<string>('');
  const [gender, setGender] = useState<string>('');
  const [maritalStatus, setMaritalStatus] = useState<string>('');
  const [empStatus, setEmpStatus] = useState<string>('');
  const [qualification, setQualification] = useState<string>('');
  const [idStatus, setIdStatus] = useState<string>('');
  const [emergencyContact, setEmergencyContact] = useState<string>('');
  const [guardian, setGuardian] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [joinDate, setJoinDate] = useState<string>('');
  const [jobStatus, setJobStatus] = useState<string>('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [jobTitle, setJobTitle] = useState<string>('');
  
  // Calculated fields
  const [age, setAge] = useState<number | null>(null);
  const [totalSalary, setTotalSalary] = useState<number>(0);
  const [workingHours, setWorkingHours] = useState<string>('');
  
  // Salary fields
  const [monthlySalary, setMonthlySalary] = useState<number>(0);
  const [dailySalary, setDailySalary] = useState<number>(0);
  const [weeklySalary, setWeeklySalary] = useState<number>(0);
  
  // Time fields
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');

  useEffect(() => {
    fetchDepartments();
    fetchNextEmpId();
    // Set default join date to today
    if (!joinDate) {
      setJoinDate(new Date().toISOString().split('T')[0]);
    }
  }, []);

  // Auto-fetch employee data when emp_id changes
  async function handleEmpIdChange(newEmpId: string) {
    setEmpId(newEmpId);
    
    if (!newEmpId) {
      setIsUpdateMode(false);
      setExistingEmployeeId(null);
      return;
    }

    // Check if employee with this ID exists
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('emp_id', newEmpId)
      .maybeSingle();

    if (data && !error) {
      // Employee exists - load data for update mode
      setIsUpdateMode(true);
      setExistingEmployeeId(data.id);
      
      // Populate all fields
      setFullName(data.full_name || '');
      setFatherGuardianName(data.father_guardian_name || '');
      setFatherGuardianOccupation(data.father_guardian_occupation || '');
      setFatherGuardianRelation(data.father_guardian_relation || '');
      setEmail(data.email || '');
      setSocialAddress(data.social_address || '');
      setEmpCnic(data.emp_cnic || '');
      setEmpCellNo(data.emp_cell_no || '');
      setFatherGuardianCnic(data.father_guardian_cnic || '');
      setFatherGuardianCellNo(data.father_guardian_cell_no || '');
      setDob(data.dob || '');
      setGender(data.gender || '');
      setMaritalStatus(data.marital_status || '');
      setEmpStatus(data.emp_status || '');
      setQualification(data.qualification || '');
      setIdStatus(data.id_status || '');
      setEmergencyContact(data.emergency_contact || '');
      setGuardian(data.guardian || '');
      setAddress(data.address || '');
      setJoinDate(data.join_date || '');
      setJobStatus(data.job_status || '');
      setDepartmentId(data.department_id || '');
      setJobTitle(data.job_title || '');
      setMonthlySalary(data.monthly_salary || 0);
      setDailySalary(data.daily_salary || 0);
      setWeeklySalary(data.weekly_salary || 0);
      setStartTime(data.start_time || '');
      setEndTime(data.end_time || '');
      setAge(data.age || null);
      setImagePreview(data.image_url || null);
      
      if (data.dob) {
        calculateAge(data.dob);
      }
    } else {
      // Employee doesn't exist - new entry mode
      setIsUpdateMode(false);
      setExistingEmployeeId(null);
    }
  }

  // Calculate age when DOB changes
  function calculateAge(dob: string) {
    if (!dob) {
      setAge(null);
      return;
    }
    const today = new Date();
    const birthDate = new Date(dob);
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      calculatedAge--;
    }
    
    setAge(Math.round(calculatedAge));
  }

  // Calculate total salary
  useEffect(() => {
    // monthly: multiply by 1
    // daily: multiply by 30 days
    // weekly: multiply by 4 weeks
    const total = (monthlySalary * 1) + (dailySalary * 30) + (weeklySalary * 4);
    setTotalSalary(total);
  }, [monthlySalary, dailySalary, weeklySalary]);

  // Calculate working hours
  useEffect(() => {
    if (startTime && endTime) {
      const start = new Date(`2000-01-01T${startTime}`);
      const end = new Date(`2000-01-01T${endTime}`);
      const diff = end.getTime() - start.getTime();
      const hours = Math.round(diff / (1000 * 60 * 60));
      setWorkingHours(hours > 0 ? `${hours}` : '');
    } else {
      setWorkingHours('');
    }
  }, [startTime, endTime]);

  // Handle image upload
  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  async function fetchDepartments() {
    const { data } = await supabase.from('departments').select('*').order('name');
    if (data) setDepartments(data);
  }

  async function fetchNextEmpId() {
    const { data } = await supabase
      .from('employees')
      .select('emp_id')
      .order('emp_id', { ascending: false })
      .limit(1);
    
    if (data && data.length > 0) {
      const lastId = parseInt(data[0].emp_id);
      if (!isNaN(lastId)) {
        const nextId = String(lastId + 1);
        setNextEmpId(nextId);
        setEmpId(nextId); // Auto-populate the emp_id field
      } else {
        setNextEmpId('1044');
        setEmpId('1044');
      }
    } else {
      setNextEmpId('1044');
      setEmpId('1044');
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    // Validate required fields
    const requiredFields: { [key: string]: any } = {
      'emp_id': empId,
      'full_name': fullName,
      'father_guardian_name': fatherGuardianName,
      'emp_cnic': empCnic,
      'emp_cell_no': empCellNo,
      'father_guardian_cnic': fatherGuardianCnic,
      'father_guardian_cell_no': fatherGuardianCellNo,
      'dob': dob,
      'emp_status': empStatus,
      'join_date': joinDate,
      'job_status': jobStatus,
      'department_id': departmentId,
      'job_title': jobTitle
    };

    for (const [field, value] of Object.entries(requiredFields)) {
      if (!value || value === 'Select' || value === '') {
        setError(`${field.replace(/_/g, ' ')} is required`);
        setLoading(false);
        return;
      }
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      let imageUrl = imagePreview;
      
      // Upload image if selected
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${empId}_${Date.now()}.${fileExt}`;
        const filePath = `employee-images/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('employees')
          .upload(filePath, imageFile);

        if (uploadError) {
          console.error('Image upload error:', uploadError);
        } else {
          const { data } = supabase.storage.from('employees').getPublicUrl(filePath);
          imageUrl = data.publicUrl;
        }
      }

      const employeeData = {
        emp_id: empId,
        full_name: fullName,
        father_guardian_name: fatherGuardianName,
        father_guardian_occupation: fatherGuardianOccupation || null,
        father_guardian_relation: fatherGuardianRelation || null,
        email: email || null,
        social_address: socialAddress || null,
        emp_cnic: empCnic,
        emp_cell_no: empCellNo,
        father_guardian_cnic: fatherGuardianCnic,
        father_guardian_cell_no: fatherGuardianCellNo,
        dob: dob,
        gender: gender !== 'Select' ? gender : null,
        marital_status: maritalStatus !== 'Select' ? maritalStatus : null,
        emp_status: empStatus,
        qualification: qualification !== 'Select' ? qualification : null,
        id_status: idStatus !== 'Select' ? idStatus : null,
        emergency_contact: emergencyContact || null,
        age: age,
        guardian: guardian !== 'Select' ? guardian : null,
        address: address || null,
        join_date: joinDate,
        job_status: jobStatus,
        department_id: departmentId,
        job_title: jobTitle,
        monthly_salary: monthlySalary || 0,
        daily_salary: dailySalary || 0,
        weekly_salary: weeklySalary || 0,
        total_salary: totalSalary || 0,
        working_hours: workingHours || '0',
        start_time: startTime || null,
        end_time: endTime || null,
        work_time: startTime && endTime ? `${startTime} - ${endTime}` : null,
        image_url: imageUrl,
        created_by: user?.id || null,
      };

      if (isUpdateMode && existingEmployeeId) {
        // Update existing employee
        const { error: updateError } = await supabase
          .from('employees')
          .update(employeeData)
          .eq('id', existingEmployeeId);

        if (updateError) throw updateError;
        
        // Log employee update
        await logEmployeeUpdated(employeeData.emp_id, employeeData);
        
        setSuccess('Employee updated successfully!');
      } else {
        // Insert new employee
        const { error: insertError } = await supabase
          .from('employees')
          .insert(employeeData);

        if (insertError) throw insertError;
        
        // Log employee creation
        await logEmployeeCreated(employeeData);
        
        setSuccess('Employee added successfully!');
      }

      setTimeout(() => {
        router.push('/dashboard/employees');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to save employee');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-center text-gray-900">Employee Data Entry Form</h1>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-4 text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-md bg-green-50 border border-green-200 p-4 text-green-700">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header with tabs and ID */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex gap-4">
                <button type="button" className="px-4 py-2 bg-gray-100 border border-gray-300 rounded text-gray-900 font-medium">
                  Information
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/employees')}
                  className="px-4 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 text-gray-900 font-medium"
                >
                  Employee List
                </button>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-semibold text-lg text-gray-900">ID:</span>
                <input
                  type="text"
                  value={empId}
                  onChange={(e) => handleEmpIdChange(e.target.value)}
                  className={`w-32 px-4 py-2 text-lg font-bold border border-gray-300 rounded text-center text-gray-900 ${isUpdateMode ? 'bg-yellow-200' : 'bg-green-200'}`}
                  required
                />
                {isUpdateMode && (
                  <span className="text-sm font-medium text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
                    Update Mode
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Personal Information */}
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4 pb-2 border-b text-gray-900">Personal Information:</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-900">
                        Full Name: <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-900">
                        Father/Guardian Name: <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={fatherGuardianName}
                        onChange={(e) => setFatherGuardianName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-900">Father/Guardian Occupation:</label>
                      <input
                        type="text"
                        value={fatherGuardianOccupation}
                        onChange={(e) => setFatherGuardianOccupation(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-900">Guardian Relation Ship:</label>
                      <input
                        type="text"
                        value={fatherGuardianRelation}
                        onChange={(e) => setFatherGuardianRelation(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-900">Email:</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-900">Social Address:</label>
                      <input
                        type="text"
                        value={socialAddress}
                        onChange={(e) => setSocialAddress(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-900">
                        Emp CNIC No: <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={empCnic}
                        onChange={(e) => setEmpCnic(e.target.value)}
                        placeholder="_____-_______-_"
                        maxLength={13}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-900">
                        Emp Cell No: <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={empCellNo}
                        onChange={(e) => setEmpCellNo(e.target.value)}
                        placeholder="____-_______"
                        maxLength={11}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-900">
                        Father/Guardian CNIC No: <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={fatherGuardianCnic}
                        onChange={(e) => setFatherGuardianCnic(e.target.value)}
                        placeholder="_____-_______-_"
                        maxLength={13}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-900">
                        Father/Guardian Cell No: <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={fatherGuardianCellNo}
                        onChange={(e) => setFatherGuardianCellNo(e.target.value)}
                        placeholder="____-_______"
                        maxLength={11}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-900">
                        D.O.B: <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={dob}
                        onChange={(e) => {
                          setDob(e.target.value);
                          calculateAge(e.target.value);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-900">Emergency Contact No:</label>
                      <input
                        type="text"
                        value={emergencyContact}
                        onChange={(e) => setEmergencyContact(e.target.value)}
                        placeholder="____-_______"
                        maxLength={11}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-900">Gender:</label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      >
                        <option>Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-900">Age:</label>
                      <input
                        type="number"
                        value={age || ''}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 cursor-not-allowed text-gray-900"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-900">Marital Status:</label>
                      <select
                        value={maritalStatus}
                        onChange={(e) => setMaritalStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      >
                        <option>Select</option>
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Divorced">Divorced</option>
                        <option value="Widowed">Widowed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-900">Guardian:</label>
                      <select
                        value={guardian}
                        onChange={(e) => setGuardian(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      >
                        <option>Select</option>
                        <option value="Father">Father</option>
                        <option value="Mother">Mother</option>
                        <option value="Spouse">Spouse</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-900">
                        Emp Status: <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={empStatus}
                        onChange={(e) => setEmpStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        required
                      >
                        <option value="">Select</option>
                        <option value="Active">Active</option>
                        <option value="Deactive">Deactive</option>
                        <option value="On Leave">On Leave</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-900">Qualification:</label>
                      <select
                        value={qualification}
                        onChange={(e) => setQualification(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      >
                        <option>Select</option>
                        <option value="Matric">Matric</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Bachelor">Bachelor</option>
                        <option value="Master">Master</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-900">ID Status:</label>
                      <select
                        value={idStatus}
                        onChange={(e) => setIdStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      >
                        <option>Select</option>
                        <option value="Verified">Verified</option>
                        <option value="Pending">Pending</option>
                        <option value="Not Provided">Not Provided</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-1 text-gray-900">Address:</label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Image and Work Info */}
              <div className="space-y-6">
                {/* Employee Image */}
                <div className="bg-yellow-50 border-2 border-yellow-400 rounded p-4">
                  <h3 className="text-sm font-semibold mb- text-gray-900 2">Employee Image</h3>
                  <div className="w-full h-64 bg-white border-2 border-gray-300 rounded flex items-center justify-center mb-2 overflow-hidden">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Employee" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-gray-400">No Image</span>
                    )}
                  </div>
                  <input
                    type="file"
                    id="image-upload"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById('image-upload')?.click()}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 text-gray-900 font-medium"
                  >
                    Add Image
                  </button>
                </div>

                {/* Work Information */}
                <div className="bg-cyan-50 border-2 border-cyan-400 rounded p-4">
                  <h3 className="text-sm font-semibold mb- text-gray-900 3">Work Information:</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-900">
                        Join Date: <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={joinDate}
                        onChange={(e) => setJoinDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-900">
                        Job Status: <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={jobStatus}
                        onChange={(e) => setJobStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        required
                      >
                        <option value="">Select</option>
                        <option value="Permanent-Full Time">Permanent-Full Time</option>
                        <option value="Permanent-Half Time">Permanent-Half Time</option>
                        <option value="Contract">Contract</option>
                        <option value="Temporary">Temporary</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-900">
                        Department: <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={departmentId}
                        onChange={(e) => setDepartmentId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        required
                      >
                        <option value="">Select</option>
                        {departments.map(dept => (
                          <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-900">
                        Job Tittle: <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        required
                      >
                        <option value="">Select</option>
                        <option value="Senior">Senior</option>
                        <option value="Junior">Junior</option>
                        <option value="Temporary">Temporary</option>
                        <option value="Intern">Intern</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-900">
                        Monthly:
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="monthly_salary"
                        value={monthlySalary || ''}
                        onChange={(e) => setMonthlySalary(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-900">
                        Daily:
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="daily_salary"
                        value={dailySalary || ''}
                        onChange={(e) => setDailySalary(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-900">
                        Weekly:
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="weekly_salary"
                        value={weeklySalary || ''}
                        onChange={(e) => setWeeklySalary(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-900">Total Salary:</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          step="0.01"
                          name="total_salary"
                          value={totalSalary}
                          readOnly
                          className="px-3 py-2 border border-gray-300 rounded bg-gray-100 cursor-not-allowed text-gray-900 font-semibold"
                        />
                        <input
                          type="text"
                          name="working_hours_display"
                          value={workingHours ? `W.H: ${workingHours}` : ''}
                          readOnly
                          placeholder="W.H:"
                          className="px-3 py-2 border border-gray-300 rounded bg-gray-100 cursor-not-allowed text-gray-900 font-semibold"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-900">Work Time:</label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Start Time:</label>
                          <input
                            type="time"
                            name="start_time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">End Time:</label>
                          <input
                            type="time"
                            name="end_time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4 mt-8 pt-6 border-t">
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-green-400 text-black font-semibold rounded hover:bg-green-500 disabled:opacity-50 min-w-[120px]"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/dashboard/employees')}
                className="px-8 py-3 bg-gray-200 text-black font-semibold rounded hover:bg-gray-300 min-w-[120px]"
              >
                Exit
              </button>
              <button
                type="button"
                className="px-8 py-3 bg-red-400 text-black font-semibold rounded hover:bg-red-500 min-w-[120px]"
              >
                Delete
              </button>
              <button
                type="button"
                className="px-8 py-3 bg-blue-200 text-black font-semibold rounded hover:bg-blue-300 min-w-[120px]"
              >
                Quick Report
              </button>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="mt-4 text-right text-sm text-gray-600 italic">
          Software Developed By M. Usman
        </div>
      </div>
    </div>
  );
}
