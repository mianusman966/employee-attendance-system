'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  chartData?: any; // For visualization data
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  timestamp: Date;
}

interface AIChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
}

export default function AIChatbot({ isOpen, onClose, userName }: AIChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showConversations, setShowConversations] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const LONGCAT_API_KEY = 'ak_17k5MQ1RD7TV3tB8Im72N4nv4XL3q';
  const LONGCAT_API_URL = 'https://api.longcat.chat/openai/v1/chat/completions';

  // All possible queries - expanded list with payroll queries
  const allQueries = [
    "Show me today's attendance report",
    "Who was absent this week?",
    "List all active employees with their departments",
    "Show attendance trend for last 7 days",
    "How many employees were late today?",
    "Department-wise attendance breakdown",
    "Show me employees who are currently checked in",
    "Weekly attendance comparison chart",
    "Top 5 departments by attendance rate",
    "Show absent pattern for this month",
    "Employee with most late arrivals this week",
    "Average working hours by department",
    "Show yesterday's attendance summary",
    "Who checked in early today?",
    "List employees with perfect attendance this week",
    "Show department with highest attendance rate",
    "Which employees are currently absent?",
    "Show overtime hours by department",
    "List recent check-ins (last 2 hours)",
    "Show monthly attendance statistics",
    "Who worked the most hours this week?",
    "Display leave requests for this month",
    "Show attendance comparison: this week vs last week",
    "List employees by shift timing",
    // PAYROLL QUERIES
    "Calculate payroll for available attendance data",
    "Show salary breakdown by department",
    "Generate payroll report for this month",
    "Calculate overtime pay for this week",
    "Show employees with late penalties",
    "Department-wise salary distribution",
    "Calculate daily wages for today's attendance",
    "Show gross pay vs net pay comparison",
    "Which employees earned the most this week?",
    "Calculate total payroll cost for this month"
  ];

  // Shuffle and select queries
  const [predefinedQueries, setPredefinedQueries] = useState<string[]>([]);

  // ✅ OPTIMIZATION: In-memory cache for context data (5 minutes TTL)
  const contextCacheRef = useRef<{ data: string | null; timestamp: number }>({
    data: null,
    timestamp: 0
  });
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // ✅ OPTIMIZATION: Rate limiting to prevent API abuse
  const rateLimitRef = useRef<number[]>([]);
  const RATE_LIMIT = {
    maxRequests: 10, // Max 10 requests
    windowMs: 60000, // Per 1 minute
  };

  function checkRateLimit(): boolean {
    const now = Date.now();
    // Remove old timestamps outside the window
    rateLimitRef.current = rateLimitRef.current.filter(
      timestamp => now - timestamp < RATE_LIMIT.windowMs
    );

    if (rateLimitRef.current.length >= RATE_LIMIT.maxRequests) {
      return false; // Rate limit exceeded
    }

    rateLimitRef.current.push(now);
    return true; // OK to proceed
  }

  useEffect(() => {
    // Shuffle and pick 4 random queries each time chatbot opens
    if (isOpen) {
      const shuffled = [...allQueries]
        .map(value => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value);
      setPredefinedQueries(shuffled.slice(0, 4));
    }
  }, [isOpen]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-save conversation when messages change (debounced)
  useEffect(() => {
    if (messages.length > 0 && !isLoading) {
      const timer = setTimeout(() => {
        saveConversation();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  // Auto-focus textarea when opened
  useEffect(() => {
    if (isOpen) {
      textareaRef.current?.focus();
      loadConversations();
    }
  }, [isOpen]);

  // Load conversations from localStorage
  function loadConversations() {
    const saved = localStorage.getItem('ai_conversations');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Convert timestamp strings back to Date objects
      const conversations = parsed.map((conv: any) => ({
        ...conv,
        timestamp: new Date(conv.timestamp),
        messages: conv.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      }));
      setConversations(conversations);
    }
  }

  // Save conversation
  function saveConversation() {
    if (messages.length === 0) return;

    const conversationTitle = messages[0]?.content.slice(0, 50) + (messages[0]?.content.length > 50 ? '...' : '');
    const newConversation: Conversation = {
      id: currentConversationId || Date.now().toString(),
      title: conversationTitle,
      messages: messages,
      timestamp: new Date()
    };

    const updatedConversations = currentConversationId
      ? conversations.map(c => c.id === currentConversationId ? newConversation : c)
      : [newConversation, ...conversations];

    setConversations(updatedConversations);
    localStorage.setItem('ai_conversations', JSON.stringify(updatedConversations));
    setCurrentConversationId(newConversation.id);
  }

  // Load a conversation
  function loadConversation(conversation: Conversation) {
    setMessages(conversation.messages);
    setCurrentConversationId(conversation.id);
    setShowConversations(false);
  }

  // Start new conversation
  function newConversation() {
    if (messages.length > 0) {
      saveConversation();
    }
    setMessages([]);
    setCurrentConversationId(null);
    setShowConversations(false);
  }

  // Delete conversation
  function deleteConversation(id: string) {
    const updated = conversations.filter(c => c.id !== id);
    setConversations(updated);
    localStorage.setItem('ai_conversations', JSON.stringify(updated));
    if (currentConversationId === id) {
      setMessages([]);
      setCurrentConversationId(null);
    }
  }

  // Generate chart data based on query and response
  function generateChartData(query: string, contextData: string): any {
    const queryLower = query.toLowerCase();
    
    // Check if query asks for trends, comparison, breakdown, or chart
    if (queryLower.includes('trend') || queryLower.includes('chart') || 
        queryLower.includes('comparison') || queryLower.includes('breakdown') ||
        queryLower.includes('pattern') || queryLower.includes('last 7 days') ||
        queryLower.includes('this week') || queryLower.includes('department')) {
      
      // Extract date statistics from context
      const dateStatsMatch = contextData.match(/(\d{4}-\d{2}-\d{2}): Total=(\d+), Present=(\d+), Absent=(\d+), Early=(\d+), On-time=(\d+), Late=(\d+)/g);
      
      if (dateStatsMatch && dateStatsMatch.length > 0) {
        const labels: string[] = [];
        const presentData: number[] = [];
        const absentData: number[] = [];
        const earlyData: number[] = [];
        const onTimeData: number[] = [];
        const lateData: number[] = [];
        
        dateStatsMatch.slice(0, 7).forEach(match => {
          const parts = match.match(/(\d{4}-\d{2}-\d{2}): Total=(\d+), Present=(\d+), Absent=(\d+), Early=(\d+), On-time=(\d+), Late=(\d+)/);
          if (parts) {
            const date = new Date(parts[1]);
            labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            presentData.push(parseInt(parts[3]));
            absentData.push(parseInt(parts[4]));
            earlyData.push(parseInt(parts[5]));
            onTimeData.push(parseInt(parts[6]));
            lateData.push(parseInt(parts[7]));
          }
        });
        
        labels.reverse();
        presentData.reverse();
        absentData.reverse();
        earlyData.reverse();
        onTimeData.reverse();
        lateData.reverse();
        
        // Return appropriate chart based on query type
        if (queryLower.includes('breakdown') || queryLower.includes('department')) {
          return {
            type: 'doughnut',
            data: {
              labels: labels,
              datasets: [{
                label: 'Present Employees',
                data: presentData,
                backgroundColor: [
                  'rgba(75, 192, 192, 0.8)',
                  'rgba(54, 162, 235, 0.8)',
                  'rgba(153, 102, 255, 0.8)',
                  'rgba(255, 159, 64, 0.8)',
                  'rgba(255, 99, 132, 0.8)',
                  'rgba(255, 206, 86, 0.8)',
                  'rgba(201, 203, 207, 0.8)',
                ],
                borderWidth: 2
              }]
            }
          };
        } else if (queryLower.includes('trend') || queryLower.includes('pattern')) {
          return {
            type: 'line',
            data: {
              labels: labels,
              datasets: [
                {
                  label: 'Present',
                  data: presentData,
                  borderColor: 'rgb(75, 192, 192)',
                  backgroundColor: 'rgba(75, 192, 192, 0.2)',
                  tension: 0.4
                },
                {
                  label: 'Absent',
                  data: absentData,
                  borderColor: 'rgb(255, 99, 132)',
                  backgroundColor: 'rgba(255, 99, 132, 0.2)',
                  tension: 0.4
                },
                {
                  label: 'Early',
                  data: earlyData,
                  borderColor: 'rgb(54, 162, 235)',
                  backgroundColor: 'rgba(54, 162, 235, 0.2)',
                  tension: 0.4
                },
                {
                  label: 'On-time',
                  data: onTimeData,
                  borderColor: 'rgb(75, 192, 75)',
                  backgroundColor: 'rgba(75, 192, 75, 0.2)',
                  tension: 0.4
                },
                {
                  label: 'Late',
                  data: lateData,
                  borderColor: 'rgb(255, 159, 64)',
                  backgroundColor: 'rgba(255, 159, 64, 0.2)',
                  tension: 0.4
                }
              ]
            }
          };
        } else {
          return {
            type: 'bar',
            data: {
              labels: labels,
              datasets: [
                {
                  label: 'Present',
                  data: presentData,
                  backgroundColor: 'rgba(75, 192, 192, 0.8)',
                },
                {
                  label: 'Absent',
                  data: absentData,
                  backgroundColor: 'rgba(255, 99, 132, 0.8)',
                },
                {
                  label: 'Early',
                  data: earlyData,
                  backgroundColor: 'rgba(54, 162, 235, 0.8)',
                },
                {
                  label: 'On-time',
                  data: onTimeData,
                  backgroundColor: 'rgba(75, 192, 75, 0.8)',
                },
                {
                  label: 'Late',
                  data: lateData,
                  backgroundColor: 'rgba(255, 159, 64, 0.8)',
                }
              ]
            }
          };
        }
      }
    }
    
    return null;
  }

  // Auto-focus textarea when opened
  useEffect(() => {
    if (isOpen) {
      textareaRef.current?.focus();
    }
  }, [isOpen]);

  // Format message content with markdown-like parsing
  const formatMessageContent = (content: string) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let currentTable: string[] = [];
    let inTable = false;
    let listItems: string[] = [];
    let inList = false;

    lines.forEach((line, index) => {
      // Table detection (lines with |)
      if (line.includes('|') && line.split('|').length > 2) {
        if (!inTable) {
          inTable = true;
          currentTable = [];
        }
        currentTable.push(line);
      } else if (inTable && currentTable.length > 0) {
        // End of table, render it
        elements.push(renderTable(currentTable, elements.length));
        currentTable = [];
        inTable = false;
      }

      // List detection (lines starting with - or *)
      if (line.trim().match(/^[-*]\s+\*\*.*\*\*/)) {
        if (!inList) {
          inList = true;
          listItems = [];
        }
        listItems.push(line);
      } else if (inList && listItems.length > 0) {
        elements.push(renderList(listItems, elements.length));
        listItems = [];
        inList = false;
      }

      // Heading detection (###, ##, #)
      if (line.trim().match(/^#{1,3}\s+\*\*(.*)\*\*/)) {
        const match = line.match(/^(#{1,3})\s+\*\*(.*)\*\*/);
        if (match) {
          const level = match[1].length;
          const text = match[2];
          elements.push(
            <h3 key={`h-${index}`} className={`font-bold ${level === 3 ? 'text-base' : level === 2 ? 'text-lg' : 'text-xl'} mb-2 mt-4`}>
              {text}
            </h3>
          );
        }
      } else if (!inTable && !inList && !line.includes('|') && line.trim()) {
        // Regular text - remove ** markers
        const cleanText = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        elements.push(
          <p key={`p-${index}`} className="mb-2" dangerouslySetInnerHTML={{ __html: cleanText }} />
        );
      }
    });

    // Handle remaining table or list
    if (currentTable.length > 0) {
      elements.push(renderTable(currentTable, elements.length));
    }
    if (listItems.length > 0) {
      elements.push(renderList(listItems, elements.length));
    }

    return elements.length > 0 ? elements : <p className="whitespace-pre-wrap">{content}</p>;
  };

  const renderTable = (tableLines: string[], key: number) => {
    const rows = tableLines.filter(line => line.trim() && !line.match(/^[-|]+$/));
    if (rows.length === 0) return null;

    const headers = rows[0].split('|').map(h => h.trim()).filter(h => h);
    const dataRows = rows.slice(1).map(row => 
      row.split('|').map(cell => cell.trim()).filter(cell => cell)
    );

    return (
      <div key={`table-${key}`} className="overflow-x-auto my-4">
        <table className="min-w-full border-collapse border border-gray-300 text-sm">
          <thead className="bg-gray-100">
            <tr>
              {headers.map((header, i) => (
                <th key={i} className="border border-gray-300 px-3 py-2 text-left font-semibold">
                  {header.replace(/\*\*/g, '')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                {row.map((cell, j) => (
                  <td key={j} className="border border-gray-300 px-3 py-2">
                    {cell.replace(/\*\*/g, '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderList = (listLines: string[], key: number) => {
    return (
      <ul key={`list-${key}`} className="list-disc list-inside my-3 space-y-1">
        {listLines.map((line, i) => {
          const text = line.replace(/^[-*]\s+/, '').replace(/\*\*/g, '');
          return (
            <li key={i} className="text-sm">
              {text}
            </li>
          );
        })}
      </ul>
    );
  };

  // Fetch relevant data based on query
  async function fetchContextData(query: string): Promise<string> {
    // ✅ OPTIMIZATION: Check cache first (5-minute TTL)
    const now = Date.now();
    if (contextCacheRef.current.data && (now - contextCacheRef.current.timestamp) < CACHE_TTL) {
      console.log('📦 Using cached context data');
      return contextCacheRef.current.data;
    }

    console.log('🔄 Fetching fresh context data from database');
    
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoDate = thirtyDaysAgo.toISOString().split('T')[0];

    let context = '';

    try {
      // Fetch departments FIRST to create mapping
      const { data: departments } = await supabase
        .from('departments')
        .select('id, name');
      
      const deptMap = new Map(departments?.map(d => [d.id, d.name]) || []);

      // ✅ OPTIMIZATION: Fetch ONLY ACTIVE employees with limits
      // This reduces data transfer and improves performance
      const { data: allEmployees } = await supabase
        .from('employees')
        .select('emp_id, full_name, department_id, job_title, emp_status, start_time, end_time, monthly_salary, daily_salary, weekly_salary, total_salary')
        .eq('emp_status', 'Active')  // ✅ Only active employees
        .order('emp_id', { ascending: true })
        .limit(500);  // ✅ Cap at 500 employees for performance

      // Create employee map for quick lookup with complete salary breakdown
      const empMap = new Map(allEmployees?.map(e => {
        // Use total_salary as the base (it's the sum of monthly + daily + weekly)
        // This is the actual total compensation for the employee
        const base_salary = e.total_salary || e.monthly_salary || 0;
        
        // Determine primary payment type based on which components exist
        let payment_type = 'Monthly';
        if (e.daily_salary && e.daily_salary > 0 && !e.monthly_salary) {
          payment_type = 'Daily';
        } else if (e.weekly_salary && e.weekly_salary > 0 && !e.monthly_salary) {
          payment_type = 'Weekly';
        }
        
        // If employee has multiple salary components, payment type is "Monthly" with breakdown
        const has_multiple_components = 
          (e.monthly_salary > 0 ? 1 : 0) + 
          (e.daily_salary > 0 ? 1 : 0) + 
          (e.weekly_salary > 0 ? 1 : 0) > 1;
        
        return [e.emp_id, {
          ...e,
          base_salary,
          payment_type,
          has_multiple_components,
          salary_breakdown: {
            monthly: e.monthly_salary || 0,
            daily: e.daily_salary || 0,
            weekly: e.weekly_salary || 0,
            total: e.total_salary || 0
          },
          department_name: deptMap.get(e.department_id) || 'Unknown'
        }];
      }) || []);

      // ✅ OPTIMIZATION: Fetch last 30 days with LIMITS and ordering
      // Reduced from potentially 30,000+ records to max 1000
      const { data: recentAttendance } = await supabase
        .from('attendance_records')
        .select('aid, emp_id, emp_name, check_in_time, check_out_time, attendance_status, working_hours, attendance_date, department, job_title, daily_bonus')
        .gte('attendance_date', thirtyDaysAgoDate)
        .order('attendance_date', { ascending: false })
        .limit(1000);  // ✅ Cap at 1000 most recent records

      // Enrich attendance data with employee salary info
      const enrichedAttendance = recentAttendance?.map(record => {
        const employee = empMap.get(record.emp_id);
        return {
          ...record,
          base_salary: employee?.base_salary || 0,
          payment_type: employee?.payment_type || 'Monthly',
          shift_start: employee?.start_time || 'N/A',
          shift_end: employee?.end_time || 'N/A',
          actual_department: employee?.department_name || record.department
        };
      }) || [];

      // Get only ACTIVE employees
      const activeEmployees = allEmployees?.filter(e => e.emp_status === 'Active') || [];

      // Group enriched attendance by date for better context
      const attendanceByDate = new Map<string, any[]>();
      enrichedAttendance?.forEach(record => {
        if (!attendanceByDate.has(record.attendance_date)) {
          attendanceByDate.set(record.attendance_date, []);
        }
        attendanceByDate.get(record.attendance_date)?.push(record);
      });

      // Get today's attendance
      const todayAttendance = attendanceByDate.get(today) || [];

      // Get this week's absent employees (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const weekAbsent = enrichedAttendance?.filter(r => 
        r.attendance_status === 'Absent' && 
        new Date(r.attendance_date) >= sevenDaysAgo
      ) || [];

      // Calculate statistics for recent dates
      const recentDates = Array.from(attendanceByDate.keys()).slice(0, 7);
      const dateStats = recentDates.map(date => {
        const records = attendanceByDate.get(date) || [];
        const present = records.filter(r => r.check_in_time).length;
        const absent = records.filter(r => r.attendance_status === 'Absent').length;
        
        // Classify attendance as Early, On-time, or Late based on shift start time
        let early = 0;
        let onTime = 0;
        let late = 0;
        
        records.forEach(r => {
          if (!r.check_in_time) return;
          
          const checkIn = new Date(r.check_in_time);
          const emp = empMap.get(r.emp_id);
          
          // Get shift start time (default to 10:00 AM if not set)
          let shiftStartHour = 10;
          let shiftStartMinute = 0;
          
          if (emp?.start_time) {
            const [hour, minute] = emp.start_time.split(':').map(Number);
            shiftStartHour = hour;
            shiftStartMinute = minute || 0;
          }
          
          const checkInMinutes = checkIn.getHours() * 60 + checkIn.getMinutes();
          const shiftStartMinutes = shiftStartHour * 60 + shiftStartMinute;
          
          // Classification logic:
          // Early: More than 15 minutes before shift start
          // On-time: Within 15 minutes before to exactly at shift start
          // Late: After shift start time
          if (checkInMinutes < shiftStartMinutes - 15) {
            early++;
          } else if (checkInMinutes <= shiftStartMinutes) {
            onTime++;
          } else {
            late++;
          }
        });
        
        return { date, total: records.length, present, absent, early, onTime, late };
      });

      // Build comprehensive context string
      context = `
=== EMPLOYEE ATTENDANCE SYSTEM DATABASE ===
Current System Date: ${today}
Data Range: Last 30 days (${thirtyDaysAgoDate} to ${today})

--- EMPLOYEE INFORMATION ---
Total Employees in System: ${allEmployees?.length || 0}
Active Employees: ${activeEmployees?.length || 0}
Departments: ${departments?.map(d => d.name).join(', ') || 'None'}

--- RECENT ATTENDANCE STATISTICS ---
${dateStats.map(stat => 
  `${stat.date}: Total=${stat.total}, Present=${stat.present}, Absent=${stat.absent}, Early=${stat.early}, On-time=${stat.onTime}, Late=${stat.late}`
).join('\n')}

--- TODAY'S ATTENDANCE WITH COMPLETE SALARY DATA (${today}) ---
Total Records: ${todayAttendance.length}
${todayAttendance.length > 0 ? todayAttendance.slice(0, 15).map(a => {
  const checkInTime = a.check_in_time ? new Date(a.check_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
  const checkOutTime = a.check_out_time ? new Date(a.check_out_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
  const emp = empMap.get(a.emp_id);
  const salary = emp?.base_salary || 0;
  const paymentType = emp?.payment_type || 'Monthly';
  
  // Build salary breakdown if multiple components exist
  let salaryDisplay = `Rs. ${salary.toLocaleString()} Total`;
  if (emp?.salary_breakdown && (emp.salary_breakdown.monthly > 0 || emp.salary_breakdown.daily > 0 || emp.salary_breakdown.weekly > 0)) {
    const parts = [];
    if (emp.salary_breakdown.monthly > 0) parts.push(`Monthly Rs. ${emp.salary_breakdown.monthly.toLocaleString()}`);
    if (emp.salary_breakdown.daily > 0) parts.push(`Daily Rs. ${emp.salary_breakdown.daily.toLocaleString()}`);
    if (emp.salary_breakdown.weekly > 0) parts.push(`Weekly Rs. ${emp.salary_breakdown.weekly.toLocaleString()}`);
    salaryDisplay = `Total: Rs. ${salary.toLocaleString()} (${parts.join(' + ')})`;
  }
  
  return `- ${a.emp_name} (ID: ${a.emp_id}) | Dept: ${emp?.department_name || a.department} | Status: ${a.attendance_status} | In: ${checkInTime} | Out: ${checkOutTime} | Hours: ${a.working_hours || 'N/A'} | Shift: ${emp?.start_time || 'N/A'}-${emp?.end_time || 'N/A'} | Salary: ${salaryDisplay} | Bonus: Rs. ${a.daily_bonus || 0}`;
}).join('\n') : 'No attendance records for today'}
${todayAttendance.length > 15 ? `... and ${todayAttendance.length - 15} more records` : ''}

--- HISTORICAL ATTENDANCE DATA (Last 30 Days) WITH PAYROLL INFO ---
Available Dates with Records: ${Array.from(attendanceByDate.keys()).join(', ')}
Total Records in Last 30 Days: ${enrichedAttendance?.length || 0}

Sample Recent Records with Salary Info (Last 5 Days):
${Array.from(attendanceByDate.entries()).slice(0, 5).map(([date, records]) => {
  const summary = records.slice(0, 5).map(r => {
    const checkInTime = r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
    return `  ${r.emp_name} (${r.emp_id}): ${r.attendance_status}, In: ${checkInTime}, Hours: ${r.working_hours || 'N/A'}, Salary: Rs. ${r.base_salary?.toLocaleString() || '0'} ${r.payment_type}, Shift: ${r.shift_start}-${r.shift_end}`;
  }).join('\n');
  return `Date: ${date} (${records.length} records)\n${summary}${records.length > 5 ? `\n  ... ${records.length - 5} more employees` : ''}`;
}).join('\n\n')}

--- ABSENCE TRACKING (Last 7 Days) ---
${weekAbsent.length > 0 ? weekAbsent.slice(0, 15).map(a => 
  `- ${a.emp_name} (${a.emp_id}): Absent on ${a.attendance_date}`
).join('\n') : 'No absences recorded in the last 7 days'}
${weekAbsent.length > 15 ? `... and ${weekAbsent.length - 15} more absent records` : ''}

--- ACTIVE EMPLOYEES LIST WITH COMPLETE SALARY DATA ---
${activeEmployees?.slice(0, 20).map(e => {
  const dept = deptMap.get(e.department_id) || 'N/A';
  const total = e.total_salary || 0;
  const monthly = e.monthly_salary || 0;
  const daily = e.daily_salary || 0;
  const weekly = e.weekly_salary || 0;
  
  // Build salary breakdown string
  let salaryInfo = `Total: Rs. ${total.toLocaleString()}`;
  if (monthly > 0 || daily > 0 || weekly > 0) {
    const components = [];
    if (monthly > 0) components.push(`Monthly: Rs. ${monthly.toLocaleString()}`);
    if (daily > 0) components.push(`Daily: Rs. ${daily.toLocaleString()}`);
    if (weekly > 0) components.push(`Weekly: Rs. ${weekly.toLocaleString()}`);
    salaryInfo += ` (${components.join(' + ')})`;
  }
  
  return `- ${e.full_name} (ID: ${e.emp_id}) | Dept: ${dept} | Role: ${e.job_title || 'N/A'} | Shift: ${e.start_time || 'N/A'} - ${e.end_time || 'N/A'} | ${salaryInfo}`;
}).join('\n')}
${activeEmployees && activeEmployees.length > 20 ? `... and ${activeEmployees.length - 20} more active employees` : ''}

--- PAYROLL CALCULATION RULES (PAKISTAN) ---
Currency: Pakistani Rupee (Rs. or PKR)
Work Day: 12 hours standard shift
Holiday: Friday (counts as full paid day for Monthly employees)

Payment Types:
1. **Monthly Salary**: Fixed monthly amount (Rs. X/month)
   - Paid regardless of actual days worked
   - Friday holidays are fully paid
   - Formula: Base Salary ÷ 30 days = Daily Rate
   - If worked partial month: Daily Rate × Days Present

2. **Daily Wage**: Paid per day worked (Rs. X/day)
   - Only paid for days actually worked
   - Friday holiday = No pay (unless worked)
   - Formula: Daily Rate × Days Worked
   - 12-hour shift = 1 day pay

3. **Weekly Wage**: Paid per week (Rs. X/week)
   - Calculated based on weeks worked
   - Formula: Weekly Rate × Weeks Worked
   - Friday included in weekly calculation

4. **Hourly Wage**: Paid per hour (Rs. X/hour)
   - Formula: Hourly Rate × Hours Worked
   - Overtime: Hours > 12/day charged at 1.5x rate

Standard Working Hours: 12 hours/day
Overtime Calculation: Hours beyond 12 = 1.5× hourly rate
Late Penalty: May apply based on company policy
Short Time: Hours less than 12 = Proportional deduction

=== END OF DATABASE CONTEXT ===

IMPORTANT INSTRUCTIONS FOR AI:
1. The above data contains REAL attendance records from the database
2. When user asks about specific dates (e.g., "4th November", "November 4", "04-11-2025"), look for that date in the "Available Dates with Records" list
3. Use natural language understanding to parse dates mentioned in queries
4. If asking about a specific date, search through the historical data provided
5. Provide accurate counts and statistics based on the data shown
6. When dates are mentioned, convert them to YYYY-MM-DD format (e.g., "4th November 2025" = "2025-11-04")
7. Be helpful and conversational while being accurate with the data
`;

      // ✅ OPTIMIZATION: Cache the result for 5 minutes
      contextCacheRef.current = {
        data: context,
        timestamp: Date.now()
      };
      
    } catch (error) {
      console.error('Error fetching context data:', error);
      context = 'Unable to fetch database information. Please try again.';
    }

    return context;
  }

  async function sendMessage(message: string) {
    if (!message.trim() || isLoading) return;

    // ✅ OPTIMIZATION: Check rate limit before processing
    if (!checkRateLimit()) {
      const errorMessage: Message = {
        role: 'assistant',
        content: '⚠️ **Rate Limit Exceeded**\n\nYou\'ve sent too many requests. Please wait a moment before trying again.\n\n**Limit:** 10 requests per minute\n\nThis helps us keep costs down and ensure fair usage for everyone. Thank you for understanding! 🙏',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Fetch context data
      const contextData = await fetchContextData(message);

      // Prepare messages for API
      const apiMessages = [
        {
          role: 'system',
          content: `You are a helpful AI assistant specialized in employee attendance management and Pakistani payroll calculations. You analyze real-time and historical attendance data to help managers make informed decisions.

${contextData}

CORE CAPABILITIES:
- Analyze attendance patterns, trends, and statistics
- **Calculate accurate Pakistani payroll based on attendance**
- Provide insights on employee performance and punctuality
- Answer queries about specific dates, employees, or departments
- Generate salary reports with Pakistani Rupee (Rs.) formatting
- Handle multiple payment types (Monthly, Daily, Weekly, Hourly)

PAYROLL EXPERTISE (PAKISTAN):
You are an expert in Pakistani payroll calculations. 

**CRITICAL: UNDERSTANDING SALARY STRUCTURE**
Each employee's salary may have MULTIPLE components:
- monthly_salary: Base monthly pay component
- daily_salary: Additional daily pay component  
- weekly_salary: Additional weekly pay component
- **total_salary: The COMPLETE sum of all components (USE THIS for calculations)**

Example from database:
Ali Waqas (1004): Monthly Rs. 32,000 + Weekly Rs. 2,000 = Total Rs. 40,000
→ Use Rs. 40,000 as the base salary for payroll calculations

When you see: "Total: Rs. 40,000 (Monthly Rs. 32,000 + Weekly Rs. 2,000)"
- The Rs. 40,000 is the ACTUAL total compensation
- This is what should be used for ALL payroll calculations
- The breakdown shows how it's composed

**PAYROLL CALCULATION FORMULAS:**

1. **Monthly Salary Employees** (most common):
   - Base Formula: Total Salary ÷ 30 = Daily Rate
   - Gross Pay: Daily Rate × Days Present
   - Friday is PAID holiday (include in calculation)
   - Example: 
     - Ali Waqas: Total Rs. 40,000/month
     - Daily Rate: Rs. 40,000 ÷ 30 = Rs. 1,333.33/day
     - Worked 22 days: Rs. 1,333.33 × 22 = Rs. 29,333.33

2. **Daily Wage Employees**:
   - Use: Daily Rate × Days Worked
   - 12 hours = 1 full day
   - Friday = No pay (unless worked)
   - Example: Rs. 1,500/day × 15 days = Rs. 22,500

3. **Overtime Calculation**:
   - Standard: 12 hours/day
   - Overtime: Hours > 12 at 1.5× hourly rate
   - Hourly Rate = (Total Salary ÷ 30 ÷ 12) for monthly employees
   - Example: Rs. 40,000 ÷ 30 ÷ 12 = Rs. 111.11/hour
   - Overtime 2 hours: Rs. 111.11 × 1.5 × 2 = Rs. 333.33

4. **Late Penalties**:
   - Apply if late arrival (after shift start time)
   - Typical: Rs. 50-200 per late instance
   - Check attendance_status for "Late" marking
   - **CLASSIFICATION LOGIC:**
     - **Early**: Arrived >15 minutes before shift start
     - **On-time**: Arrived within 15 minutes before shift start OR exactly at shift start
     - **Late**: Arrived ANY time after shift start time
   - Example: Shift starts 10:00 AM
     - 09:30 AM = Early (30 minutes before)
     - 09:50 AM = On-time (10 minutes before)
     - 10:00 AM = On-time (exactly at start)
     - 10:01 AM = Late (1 minute after start)

5. **Short Time Deduction**:
   - If worked < 12 hours
   - Calculate: (12 - Hours Worked) × Hourly Rate
   - Proportional deduction from daily pay

CURRENCY FORMATTING:
- Always use Pakistani Rupee: Rs. or PKR
- Format numbers with commas: Rs. 45,000 (not Rs. 45000)
- Show calculations clearly: Rs. 45,000 ÷ 30 × 22 = Rs. 33,000

RESPONSE GUIDELINES:
1. **CRITICAL: USE TOTAL SALARY FOR CALCULATIONS**:
   - The context shows salary as: "Total: Rs. 40,000 (Monthly Rs. 32,000 + Weekly Rs. 2,000)"
   - ALWAYS use the "Total" amount (Rs. 40,000) for payroll calculations
   - The total_salary is the complete compensation (monthly + daily + weekly combined)
   - NEVER use just monthly_salary alone if total_salary is higher
   
   Example Correct Calculation:
   - Ali Waqas: Total Rs. 40,000/month (not just Rs. 32,000)
   - Daily Rate: Rs. 40,000 ÷ 30 = Rs. 1,333.33
   - 22 days worked: Rs. 1,333.33 × 22 = Rs. 29,333.33
   
2. **Understanding Salary Breakdown**:
   - If you see "Total: Rs. X (Monthly Rs. Y + Daily Rs. Z + Weekly Rs. W)"
   - The breakdown shows composition, but Rs. X is what you calculate with
   - This accounts for employees who receive multiple salary components
   - Always mention the breakdown when showing calculations for transparency

3. **Verify Data Availability**:
   - Check if total_salary > 0 before calculating
   - Check if working_hours exists in attendance records
   - Use actual_department (from employees table) not attendance.department

4. **Accurate Calculations**:
   - Extract ACTUAL total salary from context (e.g., "Total: Rs. 40000" means use 40000)
   - Extract ACTUAL working_hours from attendance records (e.g., "Hours: 12" means worked 12 hours)
   - Extract components if shown: "Monthly Rs. 32,000 + Weekly Rs. 2,000"
   - Use REAL shift times from context (e.g., "Shift: 09:00-21:00")

5. **Show Detailed Math with REAL Numbers**:
   - Example: "Ali Waqas: Total Rs. 40,000 (Monthly Rs. 32,000 + Weekly Rs. 2,000) ÷ 30 days = Rs. 1,333.33/day × 22 days = Rs. 29,333.33"
   - Never use "[Salary]" - always show actual rupee amount
   - Always show the total and breakdown for transparency

6. **Professional Tables with ACTUAL DATA**:
   - Use markdown tables with actual employee data
   - Include columns: Employee, ID, Dept, Total Salary, Salary Breakdown, Days Present, Gross Pay
   - Fill with REAL values from context, not placeholders

7. **Handle Missing/Zero Data**:
   - If total_salary = 0 or Rs. 0: "⚠️ Salary not configured for [Employee Name]. Please update employee record with salary."
   - If working_hours missing: "Hours data not available for this date"
   - Be specific about what's missing

8. **Friday Holiday Logic**:
   - For Monthly employees: Include Friday as paid day in calculations
   - For Daily employees: Only pay if they worked on Friday
   - Check attendance_date: if it's Friday (day 5), apply special rules

9. **Overtime & Penalties from REAL DATA**:
   - working_hours > 12 = Overtime hours
   - attendance_status = "Late" = Apply penalty
   - daily_bonus field = Add to gross pay

ABSOLUTELY FORBIDDEN:
❌ NEVER say "base salaries aren't provided" - they ARE provided in context as "Total: Rs. X"
❌ NEVER show "[Salary]" or placeholder text
❌ NEVER use only monthly_salary if total_salary is higher (e.g., Don't use Rs. 32,000 when Total is Rs. 40,000)
❌ NEVER assume or estimate - use EXACT numbers from context
❌ NEVER calculate without verifying data exists first
❌ NEVER ignore the salary breakdown components (monthly + daily + weekly)

REQUIRED FORMAT for Payroll Queries:
✅ Parse employee records from context
✅ Extract: "Total: Rs. 40000 (Monthly Rs. 32000 + Weekly Rs. 2000)" → use total=40000 for calculations
✅ Extract: "Hours: 12" → working_hours=12
✅ Extract: "Shift: 10:00-22:00" → shift_start=10:00, shift_end=22:00
✅ Calculate using TOTAL SALARY (not just monthly component)
✅ Show calculation step-by-step with real values
✅ Mention breakdown for transparency: "Ali Waqas (Total Rs. 40,000 = Monthly Rs. 32,000 + Weekly Rs. 2,000)"

EXAMPLE REAL CALCULATION WITH SALARY BREAKDOWN:
Context shows: "Ali Waqas (1004) ... Total: Rs. 40,000 (Monthly Rs. 32,000 + Weekly Rs. 2,000) ... Hours: 24"

Your response:
"### Ali Waqas Payroll Calculation

**Salary Structure:**
- Monthly Component: Rs. 32,000
- Weekly Component: Rs. 2,000
- **Total Salary: Rs. 40,000/month**

**Calculation:**
- Daily Rate: Rs. 40,000 ÷ 30 = Rs. 1,333.33/day
- Hours Worked: 24 hours (2 full days)
- Days Present: 24 ÷ 12 = 2 days
- **Gross Pay: Rs. 1,333.33 × 2 = Rs. 2,666.67**

Note: The total salary (Rs. 40,000) includes both monthly and weekly components, providing complete compensation."

Always be helpful, professional, and mathematically accurate using REAL DATA ONLY.`
        },
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: message }
      ];

      // Call LongCat API
      const startTime = Date.now();
      const response = await fetch(LONGCAT_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LONGCAT_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'LongCat-Flash-Chat',
          messages: apiMessages,
          max_tokens: 2000,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const responseTime = Date.now() - startTime;
      
      // Extract token usage from API response
      const tokensUsed = data.usage?.total_tokens || 0;
      
      // ✅ TRACK AI USAGE: Log to system_metrics
      try {
        const today = new Date().toISOString().split('T')[0];
        
        // Check if record exists for today
        const { data: existingMetric } = await supabase
          .from('system_metrics')
          .select('*')
          .eq('metric_date', today)
          .single();

        if (existingMetric) {
          // Update existing record
          await supabase
            .from('system_metrics')
            .update({
              ai_api_calls_count: (existingMetric.ai_api_calls_count || 0) + 1,
              ai_tokens_used: (existingMetric.ai_tokens_used || 0) + tokensUsed,
              avg_response_time_ms: Math.round(
                ((existingMetric.avg_response_time_ms || 0) * (existingMetric.ai_api_calls_count || 0) + responseTime) 
                / ((existingMetric.ai_api_calls_count || 0) + 1)
              )
            })
            .eq('metric_date', today);
        } else {
          // Create new record
          await supabase
            .from('system_metrics')
            .insert({
              metric_date: today,
              ai_api_calls_count: 1,
              ai_tokens_used: tokensUsed,
              avg_response_time_ms: responseTime,
              database_size_mb: 0, // Will be updated separately
              active_users_count: 0
            });
        }
      } catch (trackError) {
        console.error('Error tracking AI usage:', trackError);
        // Don't fail the main request if tracking fails
      }
      
      // ✅ LOG AI CONVERSATION: Track in activity_logs
      try {
        const user = await supabase.auth.getUser();
        if (user.data.user) {
          await supabase.rpc('log_activity', {
            p_user_id: user.data.user.id,
            p_user_email: user.data.user.email || 'unknown',
            p_action: 'ai_query',
            p_resource_type: 'ai_chatbot',
            p_resource_id: null,
            p_resource_name: 'AI Assistant',
            p_description: `AI query: ${message.substring(0, 50)}...`,
            p_before_data: null,
            p_after_data: {
              query: message.substring(0, 100),
              responseTime: responseTime,
              tokensUsed: tokensUsed,
              conversationCount: messages.length + 1
            }
          });
        }
      } catch (logError) {
        // Silent fail - don't break chat functionality
      }
      
      // Generate chart data if applicable
      const chartData = generateChartData(message, contextData);
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.choices[0].message.content,
        timestamp: new Date(),
        chartData: chartData
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Save conversation after receiving response
      setTimeout(() => saveConversation(), 500);
    } catch (error: any) {
      console.error('Error calling LongCat API:', error);
      
      let errorContent = '';
      if (error.message.includes('fetch')) {
        errorContent = `🔌 **Connection Issue**\n\nI'm having trouble connecting to the AI service. This could be due to:\n- Network connectivity issues\n- API service temporarily unavailable\n\n**What you can do:**\n1. Check your internet connection\n2. Try again in a moment\n3. If the issue persists, contact support\n\nYour previous queries are still saved!`;
      } else if (error.message.includes('timeout')) {
        errorContent = `⏱️ **Request Timeout**\n\nThe request took too long to process. This might happen with complex queries.\n\n**Please try:**\n1. Simplifying your query\n2. Breaking it into smaller questions\n3. Trying again\n\nExample: Instead of "Show me all data", try "Show today's attendance"`;
      } else {
        errorContent = `⚠️ **Something Went Wrong**\n\nI encountered an unexpected error while processing your request.\n\n**Error details:** ${error.message}\n\n**What you can do:**\n1. Try rephrasing your question\n2. Start with a simpler query\n3. If this keeps happening, please contact support\n\n**Quick tips:**\n- Ask about specific dates or employees\n- Try one of the suggested queries\n- Keep queries focused on attendance data`;
      }
      
      const errorMessage: Message = {
        role: 'assistant',
        content: errorContent,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  const handlePredefinedQuery = (query: string) => {
    sendMessage(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (!isOpen) return null;

  const containerClass = isFullscreen 
    ? "fixed inset-0 bg-white shadow-2xl z-50 flex" 
    : "fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200 max-h-screen";

  return (
    <div className={containerClass}>
      {/* Conversations Sidebar (only in fullscreen) */}
      {isFullscreen && (
        <div className={`${showConversations ? 'w-80' : 'w-0'} transition-all duration-300 bg-gray-50 border-r border-gray-200 overflow-hidden flex flex-col`}>
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Conversations</h3>
            <button
              onClick={newConversation}
              className="mt-2 w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-lg hover:shadow-md transition-all text-sm font-medium"
            >
              + New conversation
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            {conversations.length === 0 ? (
              <p className="text-sm text-gray-500 text-center mt-4">No saved conversations</p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`p-3 mb-2 rounded-lg cursor-pointer hover:bg-white transition-colors ${
                    currentConversationId === conv.id ? 'bg-white shadow-sm' : 'bg-gray-100'
                  }`}
                  onClick={() => loadConversation(conv)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 line-clamp-2">{conv.title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {conv.timestamp.toLocaleDateString()} • {conv.messages.length} messages
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conv.id);
                      }}
                      className="ml-2 text-gray-400 hover:text-red-500"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-blue-500 p-4 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {isFullscreen && (
                <button
                  onClick={() => setShowConversations(!showConversations)}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              )}
              <h2 className="text-lg font-bold">
                {isFullscreen ? 'AI Assistant' : 'AI Assistant'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {isFullscreen && (
                <button
                  onClick={newConversation}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                  title="New conversation"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullscreen ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                )}
              </button>
              <button
                onClick={onClose}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Robot Icon and Greeting (only show when no messages) */}
          {messages.length === 0 && !isFullscreen && (
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-2 animate-pulse">
                <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-1">Hey {userName}</h3>
              <p className="text-white/90 text-sm">How can I help?</p>
            </div>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4" style={{ maxHeight: isFullscreen ? 'calc(100vh - 200px)' : 'calc(100vh - 250px)' }}>
          {messages.length === 0 ? (
            <div className="space-y-3 mt-4">
              {isFullscreen && (
                <div className="text-center mb-6">
                  <div className="inline-flex w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full items-center justify-center mb-3">
                    <svg className="w-12 h-12 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Hey {userName}</h3>
                  <p className="text-gray-600">How can I help you today?</p>
                </div>
              )}
              <p className="text-sm text-gray-500 text-center mb-4">{isFullscreen ? 'What\'s new?' : 'Try asking:'}</p>
              <div className={`grid ${isFullscreen ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                {predefinedQueries.map((query, index) => (
                  <button
                    key={index}
                    onClick={() => handlePredefinedQuery(query)}
                    className="text-left px-4 py-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-all border border-purple-100 hover:border-purple-300 text-sm text-gray-700 hover:text-purple-600"
                  >
                    <span className="inline-block w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                    {query}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-6`}
              >
                <div className={`flex gap-3 ${isFullscreen ? 'max-w-[75%]' : 'max-w-[90%]'}`}>
                  {/* Avatar for assistant */}
                  {msg.role === 'assistant' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                      </svg>
                    </div>
                  )}
                  
                  <div className="flex-1">
                    {/* User message bubble */}
                    {msg.role === 'user' && (
                      <div className="bg-gray-100 rounded-2xl px-4 py-3 inline-block">
                        <p className="text-sm text-gray-900">{msg.content}</p>
                      </div>
                    )}
                    
                    {/* Assistant message - no bubble, just content */}
                    {msg.role === 'assistant' && (
                      <div className="prose prose-sm max-w-none">
                        <div className="text-sm text-gray-800 leading-relaxed">
                          {formatMessageContent(msg.content)}
                        </div>
                        
                        {/* Render chart if available */}
                        {msg.chartData && (
                          <div className="mt-4 bg-white rounded-lg border border-gray-200 p-4">
                            <div className="h-64">
                              {msg.chartData.type === 'bar' && (
                                <Bar
                                  data={msg.chartData.data}
                                  options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                      legend: {
                                        display: true,
                                        position: 'top',
                                      },
                                      title: {
                                        display: true,
                                        text: 'Attendance Analytics'
                                      }
                                    },
                                    scales: {
                                      y: {
                                        beginAtZero: true
                                      }
                                    }
                                  }}
                                />
                              )}
                              {msg.chartData.type === 'line' && (
                                <Line
                                  data={msg.chartData.data}
                                  options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                      legend: {
                                        display: true,
                                        position: 'top',
                                      },
                                      title: {
                                        display: true,
                                        text: 'Attendance Trend'
                                      }
                                    },
                                    scales: {
                                      y: {
                                        beginAtZero: true
                                      }
                                    }
                                  }}
                                />
                              )}
                              {msg.chartData.type === 'doughnut' && (
                                <Doughnut
                                  data={msg.chartData.data}
                                  options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                      legend: {
                                        display: true,
                                        position: 'right',
                                      },
                                      title: {
                                        display: true,
                                        text: 'Distribution'
                                      }
                                    }
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-400 mt-2">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  
                  {/* Avatar for user */}
                  {msg.role === 'user' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                      <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex gap-3 mb-6">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                </svg>
              </div>
              <div className="flex space-x-2 items-center">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-200">
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative bg-gradient-to-r from-purple-100 via-pink-100 to-blue-100 rounded-lg p-1 animate-gradient">
            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              rows={3}
              disabled={isLoading}
              className="w-full px-4 py-3 bg-white rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 placeholder-gray-400 disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !inputMessage.trim()}
            className="absolute bottom-3 right-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white p-2 rounded-full hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    </div>
    {/* End Main Chat Area */}

      <style jsx>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  );
}
