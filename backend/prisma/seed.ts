import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const roles = [
  { role_id: 1, role_name: 'Admin' },
  { role_id: 2, role_name: 'Quản lý biên bản' },
  { role_id: 3, role_name: 'Người dùng' },
];

const minuteTypes = [
  { type_id: 1, type_name: 'Mẫu biên bản họp lớp chi tiết nhất' },
  { type_id: 2, type_name: 'Mẫu biên bản họp lớp bầu ban cán sự' },
  { type_id: 3, type_name: 'Mẫu biên bản họp lớp bầu lớp trưởng' },
  { type_id: 4, type_name: 'Mẫu biên bản họp lớp tổng kết cuối kì' },
  { type_id: 5, type_name: 'Mẫu biên bản họp lớp kỷ luật học sinh' },
  { type_id: 6, type_name: 'Mẫu biên bản họp lớp đầu năm học' },
];

const users = [
  {
    role_id: 1,
    full_name: 'Quản trị viên',
    email: 'admin@school.edu.vn',
    phone: '0900000000',
    password: 'Admin@123',
  },
  {
    role_id: 2,
    full_name: 'Nguyễn Minh Anh',
    email: 'manager@school.edu.vn',
    phone: '0912345678',
    password: 'User@123',
  },
  {
    role_id: 3,
    full_name: 'Lê Hoài Phương',
    email: 'student@school.edu.vn',
    phone: '0934567890',
    password: 'User@123',
  },
];

const toDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
const toTime = (value: string) => new Date(`1970-01-01T${value}:00.000Z`);

function getSupabaseStorageConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'meeting-attachments';
  if (!url || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for seed attachments');
  }
  return { url, serviceRoleKey, bucket };
}

function encodeStoragePath(path: string) {
  return path.split('/').map(encodeURIComponent).join('/');
}

async function ensureStorageBucket() {
  const { url, serviceRoleKey, bucket } = getSupabaseStorageConfig();
  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };

  const existing = await fetch(`${url}/storage/v1/bucket/${bucket}`, { headers });
  if (existing.ok) return;

  const created = await fetch(`${url}/storage/v1/bucket`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id: bucket, name: bucket, public: false }),
  });

  if (!created.ok) {
    const detail = await created.text().catch(() => '');
    throw new Error(`Cannot create Supabase Storage bucket ${bucket}${detail ? `: ${detail}` : ''}`);
  }
}

async function uploadSeedAttachment(path: string, content: string, mimetype: string) {
  const { url, serviceRoleKey, bucket } = getSupabaseStorageConfig();
  const response = await fetch(`${url}/storage/v1/object/${bucket}/${encodeStoragePath(path)}`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': mimetype,
      'x-upsert': 'true',
    },
    body: Buffer.from(content, 'utf-8') as any,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Cannot upload seed attachment ${path}${detail ? `: ${detail}` : ''}`);
  }
}

async function upsertBaseData() {
  await prisma.user.updateMany({
    where: { role_id: 4 },
    data: { role_id: 3 },
  });

  for (const role of roles) {
    await prisma.role.upsert({
      where: { role_id: role.role_id },
      update: { role_name: role.role_name },
      create: role,
    });
  }

  for (const type of minuteTypes) {
    await prisma.minuteType.upsert({
      where: { type_id: type.type_id },
      update: { type_name: type.type_name },
      create: type,
    });
  }

  const searcher = await prisma.user.findUnique({ where: { email: 'searcher@school.edu.vn' } });
  if (searcher) {
    await prisma.notification.deleteMany({ where: { user_id: searcher.user_id } });
    await prisma.activityLog.deleteMany({ where: { user_id: searcher.user_id } });
    await prisma.managerRoleRequest.deleteMany({ where: { user_id: searcher.user_id } });
    await prisma.supportRequest.updateMany({
      where: { handled_by: searcher.user_id },
      data: { handled_by: null },
    });
    await prisma.supportRequest.deleteMany({ where: { requested_by: searcher.user_id } });
    await prisma.user.delete({ where: { user_id: searcher.user_id } });
  }
  await prisma.role.deleteMany({ where: { role_id: 4 } });
}

async function upsertUsers() {
  const result: Record<string, { user_id: number; full_name: string }> = {};

  for (const user of users) {
    const password_hash = await bcrypt.hash(user.password, 10);
    const saved = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        role_id: user.role_id,
        full_name: user.full_name,
        phone: user.phone,
        status: 'active',
      },
      create: {
        role_id: user.role_id,
        full_name: user.full_name,
        email: user.email,
        password_hash,
        phone: user.phone,
        status: 'active',
      },
    });
    result[user.email] = { user_id: saved.user_id, full_name: saved.full_name };
  }

  return result;
}

async function seedMeetingMinutes(userMap: Record<string, { user_id: number; full_name: string }>) {
  const managerId = userMap['manager@school.edu.vn'].user_id;
  const adminId = userMap['admin@school.edu.vn'].user_id;
  await ensureStorageBucket();

  const minutes = [
    {
      minute_code: 'BB-12A1-2026-001',
      type_id: 1,
      created_by: managerId,
      title: 'Họp lớp 12A1 tháng 5',
      class_name: '12A1',
      meeting_date: toDate('2026-05-10'),
      start_time: toTime('08:00'),
      end_time: toTime('09:30'),
      location: 'Phòng 203',
      meeting_form: 'Trực tiếp',
      host_name: 'Nguyễn Minh Anh',
      secretary_name: 'Lê Hoài Phương',
      attendee_summary: '38/40 học sinh có mặt, giáo viên chủ nhiệm tham dự.',
      absentee_summary: '02 học sinh vắng có phép.',
      purpose: 'Đánh giá tình hình học tập tháng 5 và thống nhất kế hoạch ôn tập.',
      discussion_content: 'Lớp rà soát tiến độ học tập, phân công nhóm hỗ trợ các bạn còn yếu môn Toán và Tiếng Anh.',
      conclusion_content: 'Thống nhất lịch tự học vào thứ Ba và thứ Năm hằng tuần.',
      followup_summary: 'Ban cán sự cập nhật tiến độ vào cuối mỗi tuần.',
      template_data: {
        school_name: 'THPT Nguyễn Trãi',
        school_year: '2025 - 2026',
        teachers: [
          { full_name: 'Cô Phạm Thu Hà', description: 'Chủ nhiệm lớp' },
          { full_name: 'Thầy Đỗ Minh Quân', description: 'Toán' },
        ],
        chair_role: 'Lớp trưởng',
        student_total: 40,
        student_present: 38,
        student_absent: 2,
        strengths:
          'Lớp duy trì tốt nề nếp học tập, phần lớn học sinh đi học đúng giờ và chuẩn bị bài trước khi đến lớp.\nCác nhóm học tập môn Toán và Tiếng Anh hoạt động đều, hỗ trợ được nhiều bạn còn yếu.\nBạn Trần Quốc Bảo và Lê Hoài Phương tích cực nhắc nhở, tổng hợp tình hình học tập hằng tuần.',
        weaknesses:
          'Một số bạn còn quên bài tập về nhà và chưa chủ động hỏi lại khi chưa hiểu bài.\nViệc giữ vệ sinh khu vực cuối lớp chưa ổn định ở một vài buổi trực nhật.\nCần hạn chế tình trạng nói chuyện riêng trong giờ tự học.',
        class_staff_responsibility:
          'Ban cán sự lớp đã theo dõi sĩ số, nhắc nhở nề nếp và báo cáo kịp thời cho giáo viên chủ nhiệm.',
        comments:
          'Đề nghị tăng thêm thời lượng tự học có giáo viên hoặc bạn học khá hỗ trợ trước các bài kiểm tra chung.',
        recommendations:
          'Duy trì lịch tự học thứ Ba và thứ Năm; phân công rõ nhóm trưởng phụ trách từng môn để báo cáo tiến độ.',
        copies_count: 3,
      },
      status: 'completed',
      is_public: true,
      published_at: new Date('2026-05-10T03:00:00.000Z'),
      participants: [
        { full_name: 'Nguyễn Minh Anh', role_in_meeting: 'Chủ tọa', attendance_status: 'present' },
        { full_name: 'Lê Hoài Phương', role_in_meeting: 'Thư ký', attendance_status: 'present' },
        { full_name: 'Trần Quốc Bảo', role_in_meeting: 'Thành viên lớp', attendance_status: 'present' },
        { full_name: 'Phạm Gia Hân', role_in_meeting: 'Thành viên', attendance_status: 'absent' },
      ],
      tasks: [
        { task_content: 'Tổng hợp danh sách học sinh cần hỗ trợ môn Toán', assigned_to: 'Trần Quốc Bảo', deadline: toDate('2026-05-17'), task_status: 'pending' },
        { task_content: 'Chuẩn bị lịch tự học tuần tới', assigned_to: 'Lê Hoài Phương', deadline: toDate('2026-05-15'), task_status: 'completed' },
      ],
      attachments: [
        {
          file_name: 'ke-hoach-on-tap-12A1.txt',
          file_type: 'text/plain',
          content: 'Ke hoach on tap lop 12A1 thang 5/2026.\n- Thu Ba: Toan\n- Thu Nam: Tieng Anh\n',
        },
      ],
    },
    {
      minute_code: 'BB-11B2-2026-002',
      type_id: 2,
      created_by: managerId,
      title: 'Họp bầu ban cán sự lớp 11B2',
      class_name: '11B2',
      meeting_date: toDate('2026-05-12'),
      start_time: toTime('14:00'),
      end_time: toTime('15:15'),
      location: 'Phòng 305',
      meeting_form: 'Trực tiếp',
      host_name: 'Nguyễn Minh Anh',
      secretary_name: 'Trần Quốc Bảo',
      attendee_summary: '35/35 học sinh có mặt.',
      absentee_summary: null,
      purpose: 'Bầu ban cán sự mới cho học kỳ tiếp theo.',
      discussion_content: 'Lớp đề cử 4 ứng viên và tiến hành biểu quyết công khai.',
      conclusion_content: 'Nguyễn Gia Khang được bầu làm lớp trưởng, Mai Thanh Hà làm lớp phó học tập.',
      followup_summary: 'Ban cán sự mới nhận bàn giao trong tuần này.',
      template_data: {
        meeting_time_text: '14 giờ 00 phút, ngày 12 tháng 05 năm 2026',
        meeting_location_text: 'Phòng 305',
        school_year: '2025 - 2026',
        meeting_purpose: 'Bình bầu ban cán sự lớp 11B2 cho học kỳ tiếp theo.',
        teachers: [
          { full_name: 'Cô Phạm Thu Hà', description: 'Giáo viên chủ nhiệm lớp 11B2' },
        ],
        homeroom_class: '11B2',
        student_total: 35,
        student_present: 35,
        student_absent: 0,
        student_excused: 0,
        student_unexcused: 0,
        chair_name: 'Nguyễn Minh Anh',
        secretary_name: 'Trần Quốc Bảo',
        candidate_list:
          '1. Nguyễn Gia Khang - ứng viên lớp trưởng\n2. Mai Thanh Hà - ứng viên lớp phó học tập\n3. Đỗ Nhật Nam - ứng viên lớp phó phong trào\n4. Vũ Minh Châu - ứng viên thủ quỹ',
        voting_method: 'Biểu quyết công khai bằng phiếu kín tại lớp',
        vote_results: [
          { full_name: 'Nguyễn Gia Khang', vote_count: 30, ranking: 1 },
          { full_name: 'Mai Thanh Hà', vote_count: 28, ranking: 2 },
          { full_name: 'Đỗ Nhật Nam', vote_count: 22, ranking: 3 },
          { full_name: 'Vũ Minh Châu', vote_count: 20, ranking: 4 },
        ],
        staff_agreement: 'Tập thể lớp 11B2 thống nhất ban cán sự mới theo kết quả biểu quyết.',
        new_staff: [
          { full_name: 'Nguyễn Gia Khang', position: 'Lớp trưởng' },
          { full_name: 'Mai Thanh Hà', position: 'Lớp phó học tập' },
          { full_name: 'Đỗ Nhật Nam', position: 'Lớp phó phong trào' },
        ],
        staff_statement:
          'Ban cán sự mới cam kết theo dõi nề nếp, hỗ trợ học tập và phối hợp với giáo viên chủ nhiệm trong các hoạt động của lớp.',
        teacher_statement:
          'Giáo viên chủ nhiệm đề nghị ban cán sự mới làm việc công bằng, chủ động và báo cáo tình hình lớp hằng tuần.',
      },
      status: 'completed',
      is_public: false,
      published_at: null,
      participants: [
        { full_name: 'Nguyễn Minh Anh', role_in_meeting: 'Chủ tọa', attendance_status: 'present' },
        { full_name: 'Trần Quốc Bảo', role_in_meeting: 'Thư ký', attendance_status: 'present' },
        { full_name: 'Nguyễn Gia Khang', role_in_meeting: 'Ứng viên', attendance_status: 'present' },
        { full_name: 'Mai Thanh Hà', role_in_meeting: 'Ứng viên', attendance_status: 'present' },
      ],
      tasks: [
        { task_content: 'Lập biên bản bàn giao ban cán sự', assigned_to: 'Trần Quốc Bảo', deadline: toDate('2026-05-18'), task_status: 'pending' },
      ],
      attachments: [
        {
          file_name: 'ket-qua-bieu-quyet-11B2.txt',
          file_type: 'text/plain',
          content: 'Ket qua bieu quyet ban can su lop 11B2.\nLop truong: Nguyen Gia Khang.\nLop pho hoc tap: Mai Thanh Ha.\n',
        },
      ],
    },
    {
      minute_code: 'BB-10C3-2026-003',
      type_id: 6,
      created_by: adminId,
      title: 'Dự thảo họp đầu năm lớp 10C3',
      class_name: '10C3',
      meeting_date: toDate('2026-05-20'),
      start_time: toTime('07:30'),
      end_time: toTime('08:45'),
      location: 'Phòng 101',
      meeting_form: 'Trực tiếp',
      host_name: 'Quản trị viên',
      secretary_name: 'Lê Hoài Phương',
      attendee_summary: 'Dữ liệu dự thảo.',
      absentee_summary: null,
      purpose: 'Chuẩn bị nội dung sinh hoạt đầu năm.',
      discussion_content: 'Dự thảo nội quy lớp, phân công tổ trực nhật và kế hoạch sinh hoạt.',
      conclusion_content: null,
      followup_summary: 'Cập nhật sau khi họp chính thức.',
      template_data: {
        school_name: 'THPT Nguyễn Trãi',
        teachers: [
          { full_name: 'Cô Phạm Thu Hà', description: 'Giáo viên chủ nhiệm' },
        ],
        meeting_time_text: '7 giờ 30 phút, ngày 20 tháng 05 năm 2026',
        meeting_location_text: 'Phòng 101',
        chair_name: 'Quản trị viên',
        secretary_name: 'Lê Hoài Phương',
        meeting_agenda:
          'Thông qua dự thảo nội quy lớp, phân công tổ trực nhật, thống nhất lịch sinh hoạt đầu năm và kế hoạch phối hợp với phụ huynh.',
        meeting_progress:
          'Giáo viên chủ nhiệm phổ biến định hướng năm học. Lớp thảo luận các nội dung về nề nếp, học tập, vệ sinh lớp và trách nhiệm của từng tổ. Các ý kiến sẽ được tổng hợp để hoàn thiện nội quy chính thức.',
      },
      status: 'draft',
      is_public: false,
      published_at: null,
      participants: [
        { full_name: 'Quản trị viên', role_in_meeting: 'Chủ tọa', attendance_status: 'present' },
        { full_name: 'Lê Hoài Phương', role_in_meeting: 'Thư ký', attendance_status: 'present' },
      ],
      tasks: [
        { task_content: 'Hoàn thiện nội quy lớp', assigned_to: 'Lê Hoài Phương', deadline: toDate('2026-05-25'), task_status: 'pending' },
      ],
      attachments: [],
    },
  ];

  for (const item of minutes) {
    const minute = await prisma.meetingMinute.upsert({
      where: { minute_code: item.minute_code },
      update: {
        type_id: item.type_id,
        created_by: item.created_by,
        title: item.title,
        class_name: item.class_name,
        meeting_date: item.meeting_date,
        start_time: item.start_time,
        end_time: item.end_time,
        location: item.location,
        meeting_form: item.meeting_form,
        host_name: item.host_name,
        secretary_name: item.secretary_name,
        attendee_summary: item.attendee_summary,
        absentee_summary: item.absentee_summary,
        purpose: item.purpose,
        discussion_content: item.discussion_content,
        conclusion_content: item.conclusion_content,
        followup_summary: item.followup_summary,
        template_data: item.template_data,
        status: item.status,
        is_public: item.is_public,
        published_at: item.published_at,
      },
      create: {
        type_id: item.type_id,
        created_by: item.created_by,
        minute_code: item.minute_code,
        title: item.title,
        class_name: item.class_name,
        meeting_date: item.meeting_date,
        start_time: item.start_time,
        end_time: item.end_time,
        location: item.location,
        meeting_form: item.meeting_form,
        host_name: item.host_name,
        secretary_name: item.secretary_name,
        attendee_summary: item.attendee_summary,
        absentee_summary: item.absentee_summary,
        purpose: item.purpose,
        discussion_content: item.discussion_content,
        conclusion_content: item.conclusion_content,
        followup_summary: item.followup_summary,
        template_data: item.template_data,
        status: item.status,
        is_public: item.is_public,
        published_at: item.published_at,
      },
    });

    await prisma.minuteParticipant.deleteMany({ where: { minute_id: minute.minute_id } });
    await prisma.minuteTask.deleteMany({ where: { minute_id: minute.minute_id } });
    await prisma.minuteAttachment.deleteMany({ where: { minute_id: minute.minute_id } });

    if (item.participants.length) {
      await prisma.minuteParticipant.createMany({
        data: item.participants.map((participant) => ({
          minute_id: minute.minute_id,
          ...participant,
        })),
      });
    }

    if (item.tasks.length) {
      await prisma.minuteTask.createMany({
        data: item.tasks.map((task) => ({
          minute_id: minute.minute_id,
          ...task,
        })),
      });
    }

    for (const attachment of item.attachments) {
      const safeFileName = `${item.minute_code}-${attachment.file_name}`;
      const storagePath = `minute-attachments/${minute.minute_id}/${safeFileName}`;
      await uploadSeedAttachment(storagePath, attachment.content, attachment.file_type);
      await prisma.minuteAttachment.create({
        data: {
          minute_id: minute.minute_id,
          uploaded_by: item.created_by,
          file_name: attachment.file_name,
          file_path: storagePath,
          file_type: attachment.file_type,
        },
      });
    }
  }
}

async function seedOperationalData(userMap: Record<string, { user_id: number; full_name: string }>) {
  const adminId = userMap['admin@school.edu.vn'].user_id;
  const managerId = userMap['manager@school.edu.vn'].user_id;
  const studentId = userMap['student@school.edu.vn'].user_id;

  await prisma.supportRequest.deleteMany({
    where: {
      title: { in: ['Không tải được file đính kèm', 'Cần chỉnh sửa thông tin lớp'] },
    },
  });
  await prisma.supportRequest.createMany({
    data: [
      {
        requested_by: studentId,
        title: 'Không tải được file đính kèm',
        content: 'Người dùng báo lỗi khi tải file đính kèm của biên bản công khai.',
        status: 'open',
      },
      {
        requested_by: managerId,
        title: 'Cần chỉnh sửa thông tin lớp',
        content: 'Yêu cầu hỗ trợ cập nhật tên lớp trong một biên bản đã hoàn tất.',
        status: 'resolved',
        response: 'Admin đã hướng dẫn chuyển biên bản về nội bộ trước khi chỉnh sửa.',
        handled_by: adminId,
      },
    ],
  });

  await prisma.managerRoleRequest.deleteMany({ where: { user_id: studentId } });
  await prisma.managerRoleRequest.create({
    data: {
      user_id: studentId,
      reason: 'Muốn hỗ trợ lớp tạo và quản lý biên bản họp.',
      status: 'pending',
    },
  });

  await prisma.activityLog.deleteMany({
    where: {
      action_detail: {
        in: [
          'Seed: tạo dữ liệu mẫu hệ thống',
          'Seed: tạo biên bản mẫu và file đính kèm',
        ],
      },
    },
  });
  await prisma.activityLog.createMany({
    data: [
      {
        user_id: adminId,
        action_name: 'SEED',
        target_table: 'system',
        action_detail: 'Seed: tạo dữ liệu mẫu hệ thống',
      },
      {
        user_id: managerId,
        action_name: 'SEED',
        target_table: 'meeting_minutes',
        action_detail: 'Seed: tạo biên bản mẫu và file đính kèm',
      },
    ],
  });
}

async function main() {
  await upsertBaseData();
  const userMap = await upsertUsers();
  await seedMeetingMinutes(userMap);
  await seedOperationalData(userMap);

  console.log('Seed data created successfully');
  console.log('Accounts:');
  console.log('- admin@school.edu.vn / Admin@123');
  console.log('- manager@school.edu.vn / User@123');
  console.log('- student@school.edu.vn / User@123');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
