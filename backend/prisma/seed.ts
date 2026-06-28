import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ROLES = [
  { role_id: 1, role_name: 'Admin' },
  { role_id: 2, role_name: 'Quản lý biên bản' },
  { role_id: 3, role_name: 'Người dùng' },
];

const MINUTE_TYPES = [
  { type_id: 1, type_name: 'Mẫu biên bản họp lớp chi tiết nhất' },
  { type_id: 2, type_name: 'Mẫu biên bản họp lớp bầu ban cán sự' },
  { type_id: 3, type_name: 'Mẫu biên bản họp lớp bầu lớp trưởng' },
  { type_id: 4, type_name: 'Mẫu biên bản họp lớp tổng kết cuối kì' },
  { type_id: 5, type_name: 'Mẫu biên bản họp lớp kỷ luật học sinh' },
  { type_id: 6, type_name: 'Mẫu biên bản họp lớp đầu năm học' },
  { type_id: 7, type_name: 'Khác' },
];

type SeedConfig = {
  managerCount: number;
  userCount: number;
  minuteCount: number;
  includeAttachments: boolean;
  randomSeed: string;
};

type SeedUser = {
  role_id: number;
  full_name: string;
  email: string;
  phone: string;
  password: string;
};

type SeededUser = {
  user_id: number;
  full_name: string;
  email: string;
  role_id: number;
};

type TeacherRow = { full_name: string; description: string };
type ParticipantRow = { full_name: string; role_in_meeting: string; attendance_status: string };
type TaskRow = { task_content: string; assigned_to: string; deadline: Date; task_status: string };
type AttachmentRow = { file_name: string; file_type: string; content: string };
type MinuteSeedRecord = {
  minute_code: string;
  type_id: number;
  created_by: number;
  title: string;
  class_name: string;
  school_name: string;
  meeting_date: Date;
  start_time: Date;
  end_time: Date;
  location: string;
  meeting_form: string;
  host_name: string;
  secretary_name: string;
  attendee_summary: string;
  absentee_summary: string | null;
  purpose: string | null;
  discussion_content: string;
  conclusion_content: string | null;
  followup_summary: string | null;
  template_data: Record<string, unknown>;
  status: string;
  is_public: boolean;
  published_at: Date | null;
  reviewed_by: number | null;
  reviewed_at: Date | null;
  review_note: string | null;
  participants: ParticipantRow[];
  tasks: TaskRow[];
  attachments: AttachmentRow[];
};

const ADMIN_EMAIL = 'admin@school.edu.vn';
const ADMIN_PASSWORD = 'Admin@123';
const DEFAULT_USER_PASSWORD = 'User@123';
const DEFAULT_RANDOM_SEED = 'meeting-minutes-seed';
const DEFAULT_MANAGER_COUNT = 20;
const DEFAULT_USER_COUNT = 39;
const DEFAULT_MINUTE_COUNT = 240;
const BCRYPT_ROUNDS = 8;
const SEED_MANAGER_EMAIL_PREFIX = 'seed.manager.';
const SEED_USER_EMAIL_PREFIX = 'seed.user.';
const SEED_MINUTE_CODE_PREFIX = 'SEED-MM-';

const SCHOOL_NAMES = [
  'Trường THPT Nguyễn Trãi',
  'Trường THPT Lê Quý Đôn',
  'Trường THPT Trần Phú',
  'Trường THPT Lý Thường Kiệt',
  'Trường THPT Phan Bội Châu',
  'Trường THPT Hoàng Diệu',
];

const GRADE_CODES = ['10', '11', '12'];
const CLASS_LETTERS = ['A', 'B', 'C', 'D'];
const CLASS_NUMBERS = ['1', '2', '3', '4', '5'];

const FAMILY_NAMES = [
  'Nguyễn',
  'Trần',
  'Lê',
  'Phạm',
  'Hoàng',
  'Huỳnh',
  'Phan',
  'Vũ',
  'Võ',
  'Đặng',
  'Bùi',
  'Đỗ',
  'Hồ',
  'Ngô',
  'Dương',
  'Lý',
  'Đinh',
  'Cao',
  'Tạ',
  'Mai',
];

const MALE_MIDDLE_NAMES = [
  'Văn',
  'Hữu',
  'Gia',
  'Minh',
  'Quốc',
  'Thanh',
  'Hoài',
  'Nhật',
  'Tuấn',
  'Trung',
];

const FEMALE_MIDDLE_NAMES = [
  'Thị',
  'Ngọc',
  'Khánh',
  'Thu',
  'Hồng',
  'Anh',
  'Diệu',
  'Mai',
  'Phương',
  'Thanh',
];

const MALE_GIVEN_NAMES = [
  'An',
  'Bảo',
  'Duy',
  'Khôi',
  'Khang',
  'Long',
  'Minh',
  'Nam',
  'Phong',
  'Quân',
  'Sơn',
  'Thắng',
  'Thành',
  'Tùng',
  'Việt',
  'Hưng',
  'Hải',
  'Kiệt',
  'Phúc',
  'Tài',
];

const FEMALE_GIVEN_NAMES = [
  'Anh',
  'Chi',
  'Hà',
  'Hạnh',
  'Hoa',
  'Hương',
  'Khánh',
  'Lan',
  'Linh',
  'Ly',
  'My',
  'Ngân',
  'Như',
  'Phương',
  'Quỳnh',
  'Thảo',
  'Trâm',
  'Uyên',
  'Vy',
  'Yến',
];

const TEACHER_NAMES = [
  'Phạm Thu Hà',
  'Đỗ Minh Quân',
  'Nguyễn Hoàng Anh',
  'Trần Thị Ngọc Lan',
  'Lê Văn Hưng',
  'Võ Thanh Tùng',
  'Hoàng Diệu Linh',
  'Đặng Quốc Bảo',
  'Bùi Thu Trang',
  'Phan Nhật Nam',
];

const CLASS_TEACHER_ROLES = [
  'Giáo viên chủ nhiệm',
  'Giáo viên bộ môn',
  'Đại diện Ban giám hiệu',
  'Tổng phụ trách',
  'Tổ trưởng chuyên môn',
];

const STUDENT_PREFIXES = [
  'Trần',
  'Nguyễn',
  'Lê',
  'Phạm',
  'Hoàng',
  'Vũ',
  'Đặng',
  'Bùi',
  'Hồ',
  'Mai',
];

const STUDENT_MIDDLES = ['Minh', 'Gia', 'Thanh', 'Quốc', 'Ngọc', 'Thu', 'Nhật', 'Hoài'];
const STUDENT_GIVEN_NAMES = [
  'An',
  'Bảo',
  'Chi',
  'Duy',
  'Hà',
  'Hân',
  'Khang',
  'Linh',
  'Long',
  'My',
  'Nam',
  'Phúc',
  'Quân',
  'Thảo',
  'Trang',
  'Vy',
  'Yến',
  'Khôi',
  'Lan',
  'Tú',
];

const DISCIPLINE_TOPICS = [
  'đi học muộn nhiều lần',
  'không hoàn thành bài tập về nhà',
  'sử dụng điện thoại trong giờ học',
  'gây mất trật tự trong lớp',
  'không mặc đồng phục đúng quy định',
  'xô xát, tranh cãi với bạn học',
  'vi phạm nội quy khi sinh hoạt chung',
];

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readSeedConfig(): SeedConfig {
  return {
    managerCount: parsePositiveInt(process.env.SEED_MANAGER_COUNT, DEFAULT_MANAGER_COUNT),
    userCount: parsePositiveInt(process.env.SEED_USER_COUNT, DEFAULT_USER_COUNT),
    minuteCount: parsePositiveInt(process.env.SEED_MINUTE_COUNT, DEFAULT_MINUTE_COUNT),
    includeAttachments: String(process.env.SEED_INCLUDE_ATTACHMENTS || 'false').toLowerCase() === 'true',
    randomSeed: process.env.SEED_RANDOM_SEED || DEFAULT_RANDOM_SEED,
  };
}

function createRng(seedText: string) {
  let seed = 2166136261;
  for (const char of seedText) {
    seed ^= char.charCodeAt(0);
    seed = Math.imul(seed, 16777619);
  }
  if (seed === 0) seed = 1;

  return () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
}

function randomInt(rng: () => number, min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pick<T>(rng: () => number, values: T[]) {
  return values[randomInt(rng, 0, values.length - 1)];
}

function pickMany<T>(rng: () => number, values: T[], count: number) {
  const pool = [...values];
  const picked: T[] = [];
  while (pool.length && picked.length < count) {
    const index = randomInt(rng, 0, pool.length - 1);
    picked.push(pool.splice(index, 1)[0]);
  }
  return picked;
}

function toDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function toTime(value: string) {
  return new Date(`1970-01-01T${value}:00.000Z`);
}

function addSchoolDays(baseDate: Date, schoolDayOffset: number) {
  const date = new Date(baseDate);
  let remaining = schoolDayOffset;
  while (remaining > 0) {
    date.setUTCDate(date.getUTCDate() + 1);
    const day = date.getUTCDay();
    if (day !== 0 && day !== 6) {
      remaining -= 1;
    }
  }
  return date;
}

function formatVietnameseDate(date: Date) {
  return `${date.getUTCDate()} tháng ${date.getUTCMonth() + 1} năm ${date.getUTCFullYear()}`;
}

function formatVietnameseTime(hour: number, minute: number) {
  return `${hour} giờ ${String(minute).padStart(2, '0')} phút`;
}

function buildTeacherRows(rng: () => number, count = 2): TeacherRow[] {
  const rows: TeacherRow[] = [];
  const pickedNames = pickMany(rng, TEACHER_NAMES, Math.min(count, TEACHER_NAMES.length));
  pickedNames.forEach((full_name, index) => {
    rows.push({
      full_name,
      description: CLASS_TEACHER_ROLES[index % CLASS_TEACHER_ROLES.length],
    });
  });
  return rows;
}

function buildStudentName(index: number, isFemale: boolean) {
  const family = STUDENT_PREFIXES[index % STUDENT_PREFIXES.length];
  const middles = isFemale ? FEMALE_MIDDLE_NAMES : MALE_MIDDLE_NAMES;
  const givens = isFemale ? FEMALE_GIVEN_NAMES : MALE_GIVEN_NAMES;
  const middle = middles[Math.floor(index / STUDENT_PREFIXES.length) % middles.length];
  const given = givens[Math.floor(index / (STUDENT_PREFIXES.length * middles.length)) % givens.length];
  return `${family} ${middle} ${given}`;
}

function buildTeacherName(index: number, isFemale: boolean) {
  const family = FAMILY_NAMES[index % FAMILY_NAMES.length];
  const middles = isFemale ? FEMALE_MIDDLE_NAMES : MALE_MIDDLE_NAMES;
  const givens = isFemale ? FEMALE_GIVEN_NAMES : MALE_GIVEN_NAMES;
  const middle = middles[Math.floor(index / FAMILY_NAMES.length) % middles.length];
  const given = givens[Math.floor(index / (FAMILY_NAMES.length * middles.length)) % givens.length];
  return `${family} ${middle} ${given}`;
}

function buildPhoneNumber(prefix: string, index: number) {
  return `${prefix}${String(index).padStart(8, '0')}`;
}

function buildClassName(index: number) {
  const grade = GRADE_CODES[index % GRADE_CODES.length];
  const letter = CLASS_LETTERS[Math.floor(index / GRADE_CODES.length) % CLASS_LETTERS.length];
  const number = CLASS_NUMBERS[Math.floor(index / (GRADE_CODES.length * CLASS_LETTERS.length)) % CLASS_NUMBERS.length];
  return `${grade}${letter}${number}`;
}

function buildSchoolName(index: number) {
  return SCHOOL_NAMES[index % SCHOOL_NAMES.length];
}

function buildMinuteCode(index: number) {
  return `SEED-MM-${String(index + 1).padStart(4, '0')}`;
}

function buildMeetingDate(index: number) {
  return addSchoolDays(new Date('2025-08-25T00:00:00.000Z'), index);
}

function buildMeetingTime(index: number) {
  const startHour = [7, 8, 13, 14, 15][index % 5];
  const startMinute = [0, 15, 30][index % 3];
  const duration = [45, 60, 75, 90][index % 4];
  const endHour = startHour + Math.floor((startMinute + duration) / 60);
  const endMinute = (startMinute + duration) % 60;
  return {
    start_time: toTime(`${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`),
    end_time: toTime(`${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`),
    startHour,
    startMinute,
  };
}

function buildClassStats(rng: () => number) {
  const total = randomInt(rng, 34, 45);
  const present = total - randomInt(rng, 0, 3);
  const absent = total - present;
  const excused = absent > 0 ? randomInt(rng, 0, absent) : 0;
  const unexcused = Math.max(absent - excused, 0);
  return { total, present, absent, excused, unexcused };
}

function buildParagraphBlock(lines: string[]) {
  return lines.filter(Boolean).join('\n\n');
}

function buildParticipantRows(
  rng: () => number,
  chairName: string,
  secretaryName: string,
  teacherRows: TeacherRow[],
  className: string,
  minuteIndex: number
): ParticipantRow[] {
  const students: ParticipantRow[] = [];
  const studentCount = randomInt(rng, 2, 4);
  for (let i = 0; i < studentCount; i += 1) {
    students.push({
      full_name: buildStudentName(minuteIndex * 4 + i, i % 2 === 0),
      role_in_meeting: i === 0 ? 'Đại diện học sinh' : 'Thành viên lớp',
      attendance_status: i === studentCount - 1 && minuteIndex % 5 === 0 ? 'late' : 'present',
    });
  }

  const rows: ParticipantRow[] = [
    { full_name: chairName, role_in_meeting: 'Chủ tọa', attendance_status: 'present' },
    { full_name: secretaryName, role_in_meeting: 'Thư ký', attendance_status: 'present' },
    ...teacherRows.map((teacher) => ({
      full_name: teacher.full_name,
      role_in_meeting: teacher.description,
      attendance_status: 'present',
    })),
    ...students,
  ];

  if (minuteIndex % 4 === 0) {
    rows.push({
      full_name: `${className} - Ban cán sự`,
      role_in_meeting: 'Đại diện lớp',
      attendance_status: 'present',
    });
  }

  return rows;
}

function buildTasks(rng: () => number, participants: ParticipantRow[], meetingDate: Date) {
  const assignees = participants.map((participant) => participant.full_name);
  const count = randomInt(rng, 1, 3);
  const tasks: TaskRow[] = [];

  for (let i = 0; i < count; i += 1) {
    const deadline = new Date(meetingDate);
    deadline.setUTCDate(deadline.getUTCDate() + randomInt(rng, 3, 14));
    tasks.push({
      task_content: [
        'Tổng hợp ý kiến và báo cáo cho giáo viên chủ nhiệm',
        'Hoàn thiện biên bản và lưu trữ hồ sơ lớp',
        'Theo dõi việc thực hiện các nội dung đã thống nhất',
        'Chuẩn bị nội dung nhắc nhở cho buổi sinh hoạt tiếp theo',
      ][i % 4],
      assigned_to: pick(rng, assignees),
      deadline,
      task_status: pick(rng, ['pending', 'in_progress', 'completed']),
    });
  }

  return tasks;
}

function buildMinuteContent(
  typeId: number,
  context: {
    schoolName: string;
    className: string;
    teacherRows: TeacherRow[];
    chairName: string;
    secretaryName: string;
    stats: ReturnType<typeof buildClassStats>;
    meetingDate: Date;
    startHour: number;
    startMinute: number;
    rng: () => number;
    minuteIndex: number;
  }
) {
  const { schoolName, className, teacherRows, chairName, secretaryName, stats, meetingDate, startHour, startMinute, rng, minuteIndex } =
    context;
  const schoolYear = meetingDate.getUTCMonth() >= 7 ? `${meetingDate.getUTCFullYear()} - ${meetingDate.getUTCFullYear() + 1}` : `${meetingDate.getUTCFullYear() - 1} - ${meetingDate.getUTCFullYear()}`;

  switch (typeId) {
    case 1: {
      const strengths = [
        'Tập thể lớp duy trì nền nếp học tập tương đối tốt, đa số học sinh đi học đúng giờ và có ý thức chuẩn bị bài trước khi đến lớp.',
        'Các nhóm học tập hoạt động đều, nhiều học sinh chủ động hỗ trợ bạn yếu ở các môn Toán, Ngữ văn và Tiếng Anh.',
        'Ban cán sự lớp theo dõi sĩ số, nhắc nhở nề nếp và báo cáo kịp thời cho giáo viên chủ nhiệm.',
      ];
      const weaknesses = [
        'Một số học sinh còn quên bài tập về nhà, chuẩn bị chưa chu đáo cho các buổi kiểm tra định kỳ.',
        'Việc giữ vệ sinh khu vực cuối lớp và sắp xếp bàn ghế sau giờ học chưa thật sự đồng bộ.',
        'Vẫn còn vài trường hợp trao đổi riêng trong giờ tự học, làm ảnh hưởng đến sự tập trung chung của lớp.',
      ];
      const comments = [
        'Đề nghị các tổ học tập tiếp tục luân phiên nhắc bài, tổng hợp danh sách học sinh cần hỗ trợ và báo lại cho giáo viên chủ nhiệm mỗi tuần.',
        'Khuyến khích lớp tổ chức thêm các buổi tự học có hướng dẫn để củng cố nội dung đã học và chuẩn bị tốt cho các bài kiểm tra sắp tới.',
      ];
      const recommendations = [
        'Duy trì lịch tự học cố định vào đầu hoặc cuối tuần, ưu tiên môn khó và nhóm học sinh cần hỗ trợ thêm.',
        'Phân công lớp phó và tổ trưởng theo dõi từng đầu việc, cập nhật tình hình trên nhóm lớp sau mỗi buổi học.',
      ];

      return {
        template_data: {
          school_name: schoolName,
          school_year: schoolYear,
          teachers: teacherRows,
          chair_role: 'Lớp trưởng',
          student_total: stats.total,
          student_present: stats.present,
          student_absent: stats.absent,
          strengths: strengths.join('\n'),
          weaknesses: weaknesses.join('\n'),
          class_staff_responsibility:
            'Ban cán sự lớp theo dõi sĩ số, nhắc nhở nề nếp, tổng hợp vướng mắc và báo cáo lại cho giáo viên chủ nhiệm theo từng tuần.',
          comments: comments.join('\n'),
          recommendations: recommendations.join('\n'),
          copies_count: 3,
        },
        discussion_content: buildParagraphBlock([
          `Cuộc họp lớp ${className} diễn ra lúc ${formatVietnameseTime(startHour, startMinute)} ngày ${formatVietnameseDate(meetingDate)} tại phòng sinh hoạt của ${schoolName}.`,
          `Giáo viên chủ nhiệm và ban cán sự lớp đánh giá tình hình học tập, nề nếp, sĩ số, các điểm mạnh và hạn chế của tập thể lớp trong giai đoạn gần đây.`,
          `Các ý kiến thống nhất tập trung vào việc nâng cao ý thức tự học, giữ gìn vệ sinh lớp, tăng tính chủ động trong học tập và cập nhật tình hình theo tuần.`,
        ]),
        conclusion_content:
          'Tập thể lớp thống nhất tiếp tục duy trì nề nếp, tăng cường hỗ trợ học sinh còn khó khăn và thực hiện kiểm tra, nhắc nhở định kỳ theo từng tổ.',
        followup_summary:
          'Ban cán sự lớp tổng hợp tình hình thực hiện, báo cáo lại cho giáo viên chủ nhiệm vào cuối tuần.',
        purpose: 'Đánh giá tình hình học tập, nề nếp và thống nhất kế hoạch cải thiện trong thời gian tới.',
        title: `Biên bản họp lớp ${className} tháng ${String(meetingDate.getUTCMonth() + 1).padStart(2, '0')}`,
        host_name: teacherRows[0]?.full_name || chairName,
        secretary_name: secretaryName,
      };
    }
    case 2: {
      const candidates = pickMany(rng, Array.from({ length: 6 }, (_, index) => buildStudentName(minuteIndex * 6 + index, index % 2 === 1)), 4);
      const voteResults = candidates
        .map((full_name, index) => ({
          full_name,
          vote_count: randomInt(rng, 16, stats.total),
          ranking: index + 1,
        }))
        .sort((a, b) => b.vote_count - a.vote_count)
        .map((row, index) => ({ ...row, ranking: index + 1 }));
      const newStaff = voteResults.slice(0, 3).map((row, index) => ({
        full_name: row.full_name,
        position: ['Lớp trưởng', 'Lớp phó học tập', 'Lớp phó phong trào'][index],
      }));

      return {
        template_data: {
          meeting_time_text: `${formatVietnameseTime(startHour, startMinute)}, ngày ${formatVietnameseDate(meetingDate)}`,
          meeting_location_text: `Phòng sinh hoạt ${className}`,
          school_year: schoolYear,
          meeting_purpose: `Bình bầu ban cán sự lớp ${className} cho năm học ${schoolYear}.`,
          teachers: teacherRows,
          homeroom_class: className,
          student_total: stats.total,
          student_present: stats.present,
          student_absent: stats.absent,
          student_excused: stats.excused,
          student_unexcused: stats.unexcused,
          chair_name: chairName,
          secretary_name: secretaryName,
          candidate_list: candidates
            .map((name, index) => `${index + 1}. ${name} - được đề cử vào ban cán sự lớp`)
            .join('\n'),
          voting_method: 'Biểu quyết công khai bằng phiếu kín',
          vote_results: voteResults,
          staff_agreement: `Tập thể lớp ${className} thống nhất bầu ban cán sự mới trên cơ sở dân chủ, công khai và đúng quy định.`,
          new_staff: newStaff,
          staff_statement:
            'Đại diện ban cán sự lớp mới cam kết chủ động theo dõi nề nếp, hỗ trợ học tập và phối hợp chặt chẽ với giáo viên chủ nhiệm.',
          teacher_statement:
            'Giáo viên chủ nhiệm đề nghị ban cán sự mới làm việc công tâm, kịp thời và báo cáo rõ ràng tình hình lớp theo từng tuần.',
        },
        discussion_content: buildParagraphBlock([
          `Cuộc họp bình bầu ban cán sự lớp ${className} diễn ra theo đúng kế hoạch, với sự tham gia đầy đủ của học sinh và giáo viên chủ nhiệm.`,
          'Lớp đã thảo luận danh sách ứng cử viên, thống nhất hình thức bỏ phiếu và tiến hành kiểm phiếu ngay tại buổi họp.',
          `Sau khi công bố kết quả, lớp biểu quyết thông qua danh sách ban cán sự mới gồm các vị trí chủ chốt phục vụ công tác điều hành tập thể lớp.`,
        ]),
        conclusion_content: `Ban cán sự mới của lớp ${className} được thông qua và sẽ bắt đầu nhận nhiệm vụ từ tuần học tiếp theo.`,
        followup_summary: 'Thư ký hoàn thiện biên bản, giáo viên chủ nhiệm lưu hồ sơ và bàn giao nhiệm vụ cho ban cán sự mới.',
        purpose: `Bình bầu ban cán sự lớp ${className}.`,
        title: `Biên bản họp lớp ${className} bầu ban cán sự`,
        host_name: chairName,
        secretary_name: secretaryName,
      };
    }
    case 3: {
      const candidates = pickMany(rng, Array.from({ length: 6 }, (_, index) => buildStudentName(minuteIndex * 5 + index, index % 2 === 0)), 4);
      const voteCounts = candidates.map((name, index) => `${name}: ${randomInt(rng, 20, stats.total)} phiếu`);
      const winner = candidates[0];

      return {
        template_data: {
          school_name: schoolName,
          teachers: teacherRows,
          chair_role: 'Bí thư lớp',
          secretary_role: 'Lớp phó học tập',
          student_total: stats.total,
          student_present: stats.present,
          student_absent: stats.absent,
          candidates: candidates.map((name, index) => `${index + 1}. ${name}`).join('\n'),
          vote_counts: voteCounts.join('\n'),
          winner,
          elected_student_opinion:
            `Học sinh ${winner} cảm ơn tập thể lớp đã tin tưởng và cam kết hoàn thành tốt nhiệm vụ lớp trưởng.`,
          commitment: 'Chấp hành nội quy trường, lớp và pháp luật; phối hợp với giáo viên chủ nhiệm và ban cán sự lớp để giữ vững nền nếp.',
          student_opinion:
            'Tập thể lớp thống nhất lựa chọn lớp trưởng có tinh thần trách nhiệm, biết lắng nghe và hỗ trợ bạn học.',
          teacher_opinion:
            'Giáo viên chủ nhiệm nhấn mạnh lớp trưởng cần công tâm, gương mẫu và thường xuyên báo cáo tình hình lớp.',
          leader_tasks:
            'Theo dõi nền nếp lớp\nBáo cáo sĩ số và tình hình học tập\nPhối hợp tổ trưởng triển khai nhiệm vụ\nĐôn đốc các nội dung đã thống nhất trong lớp',
          leader_rights:
            'Được ưu tiên trong việc điều phối hoạt động lớp\nĐược ghi nhận trong đánh giá thi đua cuối kỳ nếu hoàn thành tốt nhiệm vụ',
          competition_direction:
            'Toàn lớp cùng xây dựng mục tiêu thi đua, duy trì học tập nghiêm túc và rèn luyện thái độ tích cực trong năm học.',
          teacher_direction:
            'Giáo viên chủ nhiệm giao nhiệm vụ cụ thể, yêu cầu lớp trưởng và các tổ trưởng phối hợp chặt chẽ, báo cáo theo tuần.',
          class_competition_opinion:
            'Các thành viên trong lớp thống nhất cùng nhau cố gắng để tập thể đạt thành tích học tập và nề nếp tốt hơn.',
          copies_count: 2,
        },
        discussion_content: buildParagraphBlock([
          `Lớp ${className} họp để bình bầu lớp trưởng mới, xác định người có năng lực tổ chức, gương mẫu và có tiếng nói điều hành tập thể.`,
          'Các học sinh tham gia thảo luận, đề cử ứng viên, công bố kết quả bình chọn và thống nhất giao nhiệm vụ cho người có số phiếu cao nhất.',
          'Giáo viên chủ nhiệm lưu ý lớp trưởng mới cần giữ vai trò cầu nối giữa giáo viên với tập thể lớp, đồng thời hỗ trợ công tác tự quản.',
        ]),
        conclusion_content: `Học sinh ${winner} được tín nhiệm giữ chức vụ lớp trưởng của lớp ${className}.`,
        followup_summary: 'Ban cán sự lớp phối hợp bàn giao nhiệm vụ, cập nhật danh sách tổ và kế hoạch thực hiện trong tuần.',
        purpose: `Bình bầu lớp trưởng cho lớp ${className}.`,
        title: `Biên bản họp lớp ${className} bầu lớp trưởng`,
        host_name: teacherRows[0]?.full_name || chairName,
        secretary_name: secretaryName,
      };
    }
    case 4: {
      return {
        template_data: {
          school_name: schoolName,
          school_year: schoolYear,
          teachers: teacherRows,
          chair_role: 'Lớp trưởng',
          student_total: stats.total,
          student_present: stats.present,
          student_absent: stats.absent,
          meeting_goal:
            'Tổng kết việc học tập, rèn luyện, thi đua và chỉ ra các nội dung cần khắc phục trong học kì.',
          political_work:
            'Tập thể lớp thực hiện tốt các quy định của trường, tham gia đầy đủ các hoạt động chung và giữ tinh thần đoàn kết.',
          teaching_work:
            'Nhiều học sinh có tiến bộ rõ ở các môn học chính; tuy nhiên vẫn cần tăng cường phụ đạo nhóm học sinh còn chậm.',
          teacher_assessment:
            'Giáo viên chủ nhiệm ghi nhận nỗ lực của lớp trong học kì vừa qua, đồng thời yêu cầu tiếp tục cải thiện tính chủ động.',
          weak_student_support:
            'Lớp cần xây dựng nhóm hỗ trợ học tập cho học sinh chưa theo kịp tiến độ và duy trì việc kiểm tra bài cũ định kỳ.',
          comments:
            'Đề nghị các tổ trưởng cập nhật tình hình học tập, sinh hoạt và phản ánh kịp thời các vấn đề phát sinh cho giáo viên chủ nhiệm.',
        },
        discussion_content: buildParagraphBlock([
          `Buổi họp tổng kết cuối kì của lớp ${className} tại ${schoolName} diễn ra nghiêm túc với đầy đủ giáo viên chủ nhiệm và đại diện học sinh.`,
          'Cuộc họp tập trung vào việc đánh giá kết quả học tập, nền nếp, công tác phong trào, tinh thần tự học và các mặt cần cải thiện trong học kì mới.',
          'Các ý kiến thống nhất tiếp tục hỗ trợ nhóm học sinh còn yếu, phát huy các cá nhân tích cực và duy trì môi trường học tập ổn định.',
        ]),
        conclusion_content: 'Tập thể lớp thống nhất phương hướng khắc phục hạn chế, duy trì thành tích và chuẩn bị tốt cho giai đoạn học tập tiếp theo.',
        followup_summary: 'Giáo viên chủ nhiệm và ban cán sự lớp theo dõi việc thực hiện các nội dung đã thống nhất sau cuộc họp.',
        purpose: 'Tổng kết tình hình học tập và rèn luyện cuối kì.',
        title: `Biên bản họp lớp ${className} tổng kết cuối kì`,
        host_name: teacherRows[0]?.full_name || chairName,
        secretary_name: secretaryName,
      };
    }
    case 5: {
      const issueNames = pickMany(
        rng,
        Array.from({ length: 5 }, (_, index) => buildStudentName(minuteIndex * 7 + index, index % 2 === 0)),
        3
      );
      const warningAgree = randomInt(rng, Math.floor(stats.total * 0.7), stats.total);
      const warningDisagree = Math.max(stats.total - warningAgree, 0);
      const reprimandAgree = randomInt(rng, Math.floor(stats.total * 0.6), stats.total);
      const reprimandDisagree = Math.max(stats.total - reprimandAgree, 0);
      const suspensionAgree = randomInt(rng, Math.floor(stats.total * 0.5), stats.total);
      const suspensionDisagree = Math.max(stats.total - suspensionAgree, 0);
      return {
        template_data: {
          school_name: schoolName,
          teachers: teacherRows,
          chair_role: 'Lớp trưởng',
          secretary_role: 'Lớp phó học tập',
          student_total: stats.total,
          student_present: stats.present,
          student_absent: stats.absent,
          violations: issueNames
            .map((name, index) => `${index + 1}. ${name} - ${pick(rng, DISCIPLINE_TOPICS)}`)
            .join('\n'),
          violation_analysis:
            'Các lỗi vi phạm được phân tích theo mức độ ảnh hưởng đến an toàn, nề nếp lớp học và hình ảnh tập thể.',
          violation_impacts:
            'Gây ảnh hưởng tới việc học tập chung\nLàm giảm tinh thần đoàn kết của tập thể\nTác động đến kỷ luật và hình ảnh nhà trường',
          violating_student_opinion:
            'Các học sinh vi phạm nhận trách nhiệm, cam kết khắc phục hậu quả và không tái phạm.',
          class_opinion:
            'Tập thể lớp đề nghị xử lý trên tinh thần giáo dục, nhắc nhở nghiêm túc và tạo điều kiện để học sinh sửa sai.',
          proposed_warning_students: issueNames.slice(0, 1).join(', '),
          proposed_warning_agree: warningAgree,
          proposed_warning_disagree: warningDisagree,
          proposed_reprimand_students: issueNames.slice(0, 2).join(', '),
          proposed_reprimand_agree: reprimandAgree,
          proposed_reprimand_disagree: reprimandDisagree,
          proposed_suspension_students: issueNames.join(', '),
          proposed_suspension_agree: suspensionAgree,
          proposed_suspension_disagree: suspensionDisagree,
          final_warning_students: issueNames.slice(0, 1).join(', '),
          final_warning_agree: warningAgree,
          final_warning_disagree: warningDisagree,
          final_reprimand_students: issueNames.slice(0, 2).join(', '),
          final_reprimand_agree: reprimandAgree,
          final_reprimand_disagree: reprimandDisagree,
          final_suspension_students: issueNames.join(', '),
          final_suspension_agree: suspensionAgree,
          final_suspension_disagree: suspensionDisagree,
          teacher_notice:
            'Giáo viên chủ nhiệm nhắc nhở tập thể lớp và ban cán sự theo dõi sát tình hình, phối hợp gia đình để hỗ trợ học sinh vi phạm.',
        },
        discussion_content: buildParagraphBlock([
          `Cuộc họp kỷ luật của lớp ${className} được tổ chức để xem xét các vi phạm đã xảy ra trong thời gian gần đây và thống nhất biện pháp xử lý.`,
          'Giáo viên chủ nhiệm, ban cán sự lớp và đại diện học sinh phân tích nguyên nhân, hậu quả và mức độ ảnh hưởng của từng hành vi vi phạm.',
          'Tập thể lớp biểu quyết phương án nhắc nhở, phê bình hoặc khiển trách phù hợp với từng trường hợp, đồng thời giao nhiệm vụ theo dõi khắc phục.',
        ]),
        conclusion_content: 'Cuộc họp thống nhất áp dụng biện pháp giáo dục phù hợp, yêu cầu các học sinh liên quan cam kết sửa chữa và báo cáo lại tiến độ.',
        followup_summary: 'Giáo viên chủ nhiệm, ban cán sự lớp và gia đình học sinh phối hợp theo dõi việc khắc phục sau cuộc họp.',
        purpose: 'Xem xét và xử lý các vi phạm nề nếp, kỷ luật của học sinh.',
        title: `Biên bản họp lớp ${className} kỷ luật học sinh`,
        host_name: teacherRows[0]?.full_name || chairName,
        secretary_name: secretaryName,
      };
    }
    case 6: {
      return {
        template_data: {
          school_name: schoolName,
          meeting_time_text: `${formatVietnameseTime(startHour, startMinute)}, ngày ${formatVietnameseDate(meetingDate)}`,
          meeting_location_text: `Phòng sinh hoạt ${className}`,
          teachers: teacherRows,
          chair_name: chairName,
          secretary_name: secretaryName,
          meeting_agenda:
            'Triển khai nội quy đầu năm, phổ biến kế hoạch học tập, phân công tổ trực nhật, thống nhất cách thức phối hợp với giáo viên chủ nhiệm và phụ huynh.',
          meeting_progress:
            'Giáo viên chủ nhiệm phổ biến mục tiêu năm học, ban cán sự ghi nhận ý kiến của học sinh và thống nhất các đầu việc cần thực hiện ngay trong tuần đầu tiên.',
        },
        discussion_content: buildParagraphBlock([
          `Cuộc họp đầu năm học của lớp ${className} tại ${schoolName} diễn ra đúng giờ, có đầy đủ giáo viên chủ nhiệm và đại diện các tổ.`,
          'Nội dung tập trung vào ổn định nền nếp, phổ biến quy định lớp học, kế hoạch học tập, lịch sinh hoạt và cách phối hợp giữa gia đình với nhà trường.',
          'Tập thể lớp thống nhất tinh thần chủ động, trách nhiệm và hợp tác để bắt đầu năm học mới với nền nếp tốt hơn.',
        ]),
        conclusion_content: 'Lớp thống nhất kế hoạch sinh hoạt đầu năm và giao các đầu việc cho ban cán sự ngay sau buổi họp.',
        followup_summary: 'Ban cán sự lớp cập nhật nội dung họp, phân công nhiệm vụ và theo dõi tiến độ thực hiện trong tuần đầu năm học.',
        purpose: 'Chuẩn bị và triển khai nội dung sinh hoạt đầu năm học.',
        title: `Biên bản họp lớp ${className} đầu năm học`,
        host_name: chairName,
        secretary_name: secretaryName,
      };
    }
    default: {
      return {
        template_data: {
          school_name: schoolName,
          teachers: teacherRows,
          copies_count: 2,
        },
        discussion_content: buildParagraphBlock([
          `Cuộc họp lớp ${className} được tổ chức để trao đổi các nội dung chung của tập thể lớp.`,
          'Các thành viên tham dự thống nhất nội dung sinh hoạt, phương hướng thực hiện nhiệm vụ và các đầu việc cần triển khai tiếp theo.',
          'Biên bản được lập để lưu trữ, theo dõi và làm căn cứ triển khai các hoạt động của lớp.',
        ]),
        conclusion_content: 'Các nội dung đã được thống nhất và giao cho ban cán sự lớp theo dõi thực hiện.',
        followup_summary: 'Thư ký hoàn thiện biên bản và bàn giao cho người phụ trách lưu trữ hồ sơ lớp.',
        purpose: 'Ghi nhận nội dung buổi họp lớp và các thống nhất chung.',
        title: `Biên bản họp lớp ${className}`,
        host_name: chairName,
        secretary_name: secretaryName,
      };
    }
  }
}

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
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { role_id: role.role_id },
      update: { role_name: role.role_name },
      create: role,
    });
  }

  for (const type of MINUTE_TYPES) {
    await prisma.minuteType.upsert({
      where: { type_id: type.type_id },
      update: { type_name: type.type_name },
      create: type,
    });
  }
}

function chunkArray<T>(values: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function buildSeedUsers(config: SeedConfig) {
  const users: SeedUser[] = [
    {
      role_id: 1,
      full_name: 'Quản trị viên hệ thống',
      email: ADMIN_EMAIL,
      phone: '0900000000',
      password: ADMIN_PASSWORD,
    },
  ];

  for (let index = 0; index < config.managerCount; index += 1) {
    const isFemale = index % 2 === 0;
    users.push({
      role_id: 2,
      full_name: buildTeacherName(index, isFemale),
      email: `seed.manager.${String(index + 1).padStart(2, '0')}@school.edu.vn`,
      phone: buildPhoneNumber('0912', index + 1),
      password: DEFAULT_USER_PASSWORD,
    });
  }

  for (let index = 0; index < config.userCount; index += 1) {
    const isFemale = index % 2 === 1;
    users.push({
      role_id: 3,
      full_name: buildStudentName(index, isFemale),
      email: `seed.user.${String(index + 1).padStart(2, '0')}@school.edu.vn`,
      phone: buildPhoneNumber('0934', index + 1),
      password: DEFAULT_USER_PASSWORD,
    });
  }

  return users;
}

async function cleanupSeedData() {
  await prisma.meetingMinute.deleteMany({
    where: {
      minute_code: {
        startsWith: SEED_MINUTE_CODE_PREFIX,
      },
    },
  });

  await prisma.user.deleteMany({
    where: {
      email: {
        startsWith: SEED_MANAGER_EMAIL_PREFIX,
      },
    },
  });

  await prisma.user.deleteMany({
    where: {
      email: {
        startsWith: SEED_USER_EMAIL_PREFIX,
      },
    },
  });
}

async function upsertUsers(config: SeedConfig) {
  const seedUsers = buildSeedUsers(config);
  const now = new Date();
  const adminSeed = seedUsers[0];
  const accountSeeds = seedUsers.slice(1);

  const adminPasswordHash = await bcrypt.hash(adminSeed.password, BCRYPT_ROUNDS);
  const admin = await prisma.user.upsert({
    where: { email: adminSeed.email },
    update: {
      role_id: adminSeed.role_id,
      full_name: adminSeed.full_name,
      phone: adminSeed.phone,
      password_hash: adminPasswordHash,
      status: 'active',
      email_verified_at: now,
    },
    create: {
      role_id: adminSeed.role_id,
      full_name: adminSeed.full_name,
      email: adminSeed.email,
      password_hash: adminPasswordHash,
      phone: adminSeed.phone,
      status: 'active',
      email_verified_at: now,
    },
  });

  const hashedSeeds = await Promise.all(
    accountSeeds.map(async (user) => ({
      ...user,
      password_hash: await bcrypt.hash(user.password, BCRYPT_ROUNDS),
    }))
  );

  const seedRows = hashedSeeds.map((user) => ({
    role_id: user.role_id,
    full_name: user.full_name,
    email: user.email,
    password_hash: user.password_hash,
    phone: user.phone,
    status: 'active',
    email_verified_at: now,
  }));

  for (const batch of chunkArray(seedRows, 50)) {
    await prisma.user.createMany({
      data: batch,
      skipDuplicates: true,
    });
  }

  const createdUsers = await prisma.user.findMany({
    where: {
      email: {
        in: [adminSeed.email, ...accountSeeds.map((user) => user.email)],
      },
    },
    select: {
      user_id: true,
      full_name: true,
      email: true,
      role_id: true,
    },
  });

  const userMap: Record<string, SeededUser> = {};
  for (const user of createdUsers) {
    userMap[user.email] = user;
  }

  return userMap;
}

function pickMinuteType(index: number) {
  const typeCycle = [1, 2, 6, 1, 4, 3, 5, 1, 2, 4, 6, 7];
  return typeCycle[index % typeCycle.length];
}

async function seedMeetingMinutes(config: SeedConfig, userMap: Record<string, SeededUser>) {
  const rng = createRng(config.randomSeed);
  const admin = userMap[ADMIN_EMAIL];
  const managers = Object.values(userMap).filter((user) => user.role_id === 2);
  const users = Object.values(userMap).filter((user) => user.role_id === 3);

  if (!admin) {
    throw new Error('Admin account is missing from seed user map');
  }

  const minuteRecords: MinuteSeedRecord[] = [];
  for (let index = 0; index < config.minuteCount; index += 1) {
    const typeId = pickMinuteType(index);
    const meetingDate = buildMeetingDate(index);
    const { start_time, end_time, startHour, startMinute } = buildMeetingTime(index);
    const className = buildClassName(index);
    const schoolName = buildSchoolName(index);
    const teacherRows = buildTeacherRows(rng, typeId === 6 ? 1 : 2);
    const stats = buildClassStats(rng);
    const isAdminCreated = index % 4 === 0;
    const creator = isAdminCreated
      ? admin
      : managers[index % Math.max(managers.length, 1)] || admin;
    const chairName = typeId === 2 || typeId === 6 ? creator.full_name : pick(rng, users).full_name;
    const secretaryName = pick(rng, [...users.map((user) => user.full_name), ...managers.map((manager) => manager.full_name)]);
    const minuteCode = buildMinuteCode(index);
    const minuteInfo = buildMinuteContent(typeId, {
      schoolName,
      className,
      teacherRows,
      chairName,
      secretaryName,
      stats,
      meetingDate,
      startHour,
      startMinute,
      rng,
      minuteIndex: index,
    });
    const status = index % 5 === 0 ? 'draft' : 'completed';
    const isPublic = status === 'completed' && index % 3 !== 0;
    const publishedAt = isPublic ? new Date(Date.UTC(meetingDate.getUTCFullYear(), meetingDate.getUTCMonth(), meetingDate.getUTCDate(), 3, 0, 0)) : null;
    const templateData = minuteInfo.template_data;
    const participants = buildParticipantRows(rng, chairName, secretaryName, teacherRows, className, index);
    const tasks = buildTasks(rng, participants, meetingDate);
    const attachments: AttachmentRow[] = [];

    if (config.includeAttachments && index % 20 === 0) {
      attachments.push({
        file_name: `bien-ban-${className.toLowerCase()}-${String(index + 1).padStart(4, '0')}.txt`,
        file_type: 'text/plain',
        content: [
          `Bien ban mau ${minuteCode}`,
          `Truong: ${schoolName}`,
          `Lop: ${className}`,
          `Noi dung: ${minuteInfo.purpose}`,
        ].join('\n'),
      });
    }
    minuteRecords.push({
      minute_code: minuteCode,
      type_id: typeId,
      created_by: creator.user_id,
      title: minuteInfo.title,
      class_name: className,
      school_name: schoolName,
      meeting_date: meetingDate,
      start_time,
      end_time,
      location: `Phòng ${randomInt(rng, 101, 409)}`,
      meeting_form: index % 2 === 0 ? 'Trực tiếp' : 'Trực tuyến',
      host_name: minuteInfo.host_name || creator.full_name,
      secretary_name: minuteInfo.secretary_name || secretaryName,
      attendee_summary: `${stats.present}/${stats.total} học sinh có mặt.`,
      absentee_summary: stats.absent > 0 ? `${stats.absent} học sinh vắng mặt.` : null,
      purpose: minuteInfo.purpose,
      discussion_content: minuteInfo.discussion_content,
      conclusion_content: minuteInfo.conclusion_content,
      followup_summary: minuteInfo.followup_summary,
      template_data: templateData,
      status,
      is_public: isPublic,
      published_at: publishedAt,
      reviewed_by: status === 'completed' ? admin.user_id : null,
      reviewed_at: status === 'completed' ? publishedAt || meetingDate : null,
      review_note: status === 'completed' ? 'Seed dữ liệu mẫu' : null,
      participants,
      tasks,
      attachments,
    });
  }

  for (const batch of chunkArray(
    minuteRecords.map((record) => ({
      minute_code: record.minute_code,
      type_id: record.type_id,
      created_by: record.created_by,
      title: record.title,
      class_name: record.class_name,
      meeting_date: record.meeting_date,
      start_time: record.start_time,
      end_time: record.end_time,
      location: record.location,
      meeting_form: record.meeting_form,
      host_name: record.host_name,
      secretary_name: record.secretary_name,
      attendee_summary: record.attendee_summary,
      absentee_summary: record.absentee_summary,
      purpose: record.purpose,
      discussion_content: record.discussion_content,
      conclusion_content: record.conclusion_content,
      followup_summary: record.followup_summary,
      template_data: record.template_data as Prisma.InputJsonValue,
      status: record.status,
      is_public: record.is_public,
      published_at: record.published_at,
      reviewed_by: record.reviewed_by,
      reviewed_at: record.reviewed_at,
      review_note: record.review_note,
    })),
    50
  )) {
    await prisma.meetingMinute.createMany({
      data: batch,
      skipDuplicates: true,
    });
  }

  const savedMinutes = await prisma.meetingMinute.findMany({
    where: {
      minute_code: {
        in: minuteRecords.map((record) => record.minute_code),
      },
    },
    select: {
      minute_id: true,
      minute_code: true,
    },
  });

  const minuteIdMap = new Map(savedMinutes.map((minute) => [minute.minute_code, minute.minute_id]));
  const participantRows: Array<ParticipantRow & { minute_id: number }> = [];
  const taskRows: Array<TaskRow & { minute_id: number }> = [];
  for (const record of minuteRecords) {
    const minuteId = minuteIdMap.get(record.minute_code);
    if (!minuteId) {
      continue;
    }

    participantRows.push(
      ...record.participants.map((participant) => ({
        minute_id: minuteId,
        ...participant,
      }))
    );

    taskRows.push(
      ...record.tasks.map((task) => ({
        minute_id: minuteId,
        ...task,
      }))
    );

    for (const attachment of record.attachments) {
      if (!config.includeAttachments) {
        continue;
      }
      const storagePath = `minute-attachments/${minuteId}/${record.minute_code}-${attachment.file_name}`;
      await uploadSeedAttachment(storagePath, attachment.content, attachment.file_type);
      await prisma.minuteAttachment.create({
        data: {
          minute_id: minuteId,
          uploaded_by: record.created_by,
          file_name: attachment.file_name,
          file_path: storagePath,
          file_type: attachment.file_type,
          is_public_safe: true,
          public_scan_status: 'approved',
        },
      });
    }
  }

  for (const batch of chunkArray(participantRows, 200)) {
    await prisma.minuteParticipant.createMany({ data: batch });
  }

  for (const batch of chunkArray(taskRows, 200)) {
    await prisma.minuteTask.createMany({ data: batch });
  }
}

async function main() {
  const config = readSeedConfig();
  await upsertBaseData();
  await cleanupSeedData();
  const userMap = await upsertUsers(config);
  await seedMeetingMinutes(config, userMap);

  console.log('Seed data created successfully');
  console.log(`Users: ${config.managerCount + config.userCount + 1}`);
  console.log(`Meeting minutes: ${config.minuteCount}`);
  console.log('Default accounts:');
  console.log(`- ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`- seed.manager.01@school.edu.vn / ${DEFAULT_USER_PASSWORD}`);
  console.log(`- seed.user.01@school.edu.vn / ${DEFAULT_USER_PASSWORD}`);
  if (config.includeAttachments) {
    console.log('Attachments: enabled');
  } else {
    console.log('Attachments: disabled by default');
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
