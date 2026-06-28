import dayjs from 'dayjs'
import { MeetingMinute } from '../types'
import { formatDate, formatTime } from './index'

export const MINUTE_TYPE_NAMES: Record<number, string> = {
  1: 'Mẫu biên bản họp lớp chi tiết nhất',
  2: 'Mẫu biên bản họp lớp bầu ban cán sự',
  3: 'Mẫu biên bản họp lớp bầu lớp trưởng',
  4: 'Mẫu biên bản họp lớp tổng kết cuối kì',
  5: 'Mẫu biên bản họp lớp kỷ luật học sinh',
  6: 'Mẫu biên bản họp lớp đầu năm học',
  7: 'Khác',
}

type TemplateDefaults = {
  title: string
  purpose: string
}

export type TemplateFieldType = 'text' | 'textarea' | 'number' | 'table'

export type TemplateTableColumn = {
  name: string
  label: string
  type?: 'text' | 'number'
  placeholder?: string
}

export type TemplateField = {
  name: string
  label: string
  type?: TemplateFieldType
  required?: boolean
  placeholder?: string
  columns?: TemplateTableColumn[]
}

export type TemplateSection = {
  title: string
  fields: TemplateField[]
}

export const MINUTE_TEMPLATE_DEFAULTS: Record<number, TemplateDefaults> = {
  1: {
    title: 'Biên bản họp lớp',
    purpose:
      'Tổ chức họp lớp để triển khai một số công việc nhằm phục vụ cho năm học.',
  },
  2: {
    title: 'Biên bản họp lớp bầu ban cán sự',
    purpose: 'Bình bầu ban cán sự lớp năm học.',
  },
  3: {
    title: 'Biên bản họp lớp bầu lớp trưởng',
    purpose:
      'Tổ chức họp lớp để triển khai một số nội dung về bình bầu lớp trưởng.',
  },
  4: {
    title: 'Biên bản họp lớp tổng kết cuối kì',
    purpose:
      'Tổ chức họp lớp tổng kết cuối kì và xác định các điểm cần khắc phục.',
  },
  5: {
    title: 'Biên bản họp lớp kỷ luật học sinh',
    purpose: 'Tổ chức họp lớp để xét kỷ luật học sinh vi phạm.',
  },
  6: {
    title: 'Biên bản họp lớp đầu năm học',
    purpose: 'Tổ chức họp lớp đầu năm học.',
  },
}

export const STRUCTURED_TEMPLATE_SECTIONS: Record<
  number,
  TemplateSection[]
> = {
  1: [
    {
      title: 'Thông tin chung của mẫu',
      fields: [
        {
          name: 'school_name',
          label: 'Trường',
          placeholder: 'VD: Trường THPT ...',
        },
        {
          name: 'school_year',
          label: 'Năm học',
          placeholder: 'VD: 2025 - 2026',
        },
      ],
    },
    {
      title: 'Thành phần tham dự',
      fields: [
        {
          name: 'teachers',
          label: 'Thầy/Cô',
          type: 'table',
          columns: [
            { name: 'full_name', label: 'Họ tên thầy/cô', placeholder: 'Họ tên thầy/cô tham dự' },
            { name: 'description', label: 'Phụ trách môn', placeholder: 'VD: Toán / Ngữ văn / Chủ nhiệm lớp ...' },
          ],
        },
        {
          name: 'chair_role',
          label: 'Vai trò chủ trì',
          placeholder: 'VD: Lớp trưởng',
        },
        {
          name: 'student_total',
          label: 'Sĩ số học sinh của lớp',
          type: 'number',
          placeholder: 'VD: 45',
        },
        {
          name: 'student_present',
          label: 'Số học sinh có mặt',
          type: 'number',
          placeholder: 'VD: 43',
        },
        {
          name: 'student_absent',
          label: 'Số học sinh vắng mặt',
          type: 'number',
          placeholder: 'VD: 2',
        },
      ],
    },
    {
      title: 'Đánh giá chung',
      fields: [
        {
          name: 'strengths',
          label: 'Mặt mạnh',
          type: 'textarea',
          placeholder: 'Thực hiện quy chế, nội quy; hoạt động hiệu quả; cá nhân tiêu biểu...',
        },
        {
          name: 'weaknesses',
          label: 'Mặt yếu',
          type: 'textarea',
          placeholder: 'Vi phạm quy chế, nội quy; đạo đức, tác phong; lối sống; lên lớp; thi, kiểm tra; bỏ học...',
        },
        {
          name: 'class_staff_responsibility',
          label: 'Tinh thần trách nhiệm của cán bộ lớp',
          type: 'textarea',
        },
      ],
    },
    {
      title: 'Góp ý và kiến nghị',
      fields: [
        {
          name: 'comments',
          label: 'Ý kiến góp ý',
          type: 'textarea',
        },
        {
          name: 'recommendations',
          label: 'Đề xuất, kiến nghị',
          type: 'textarea',
        },
        {
          name: 'copies_count',
          label: 'Số bản biên bản được lập',
          type: 'number',
          placeholder: 'VD: 3',
        },
      ],
    },
  ],

  2: [
    {
      title: 'Thời gian, địa điểm, mục đích tổ chức cuộc họp',
      fields: [
        {
          name: 'meeting_time_text',
          label: 'Thời gian',
          placeholder: 'VD: 8 giờ 00 phút, ngày 10 tháng 9 năm 2025',
        },
        {
          name: 'meeting_location_text',
          label: 'Địa điểm',
          placeholder: 'VD: Phòng A101',
        },
        {
          name: 'school_year',
          label: 'Năm học',
          placeholder: '2025 - 2026',
        },
        {
          name: 'meeting_purpose',
          label: 'Mục đích',
          placeholder: 'Bình bầu ban cán sự lớp ... năm học ...',
        },
      ],
    },
    {
      title: 'Thành phần tham dự',
      fields: [
        {
          name: 'teachers',
          label: 'Thầy/Cô',
          type: 'table',
          columns: [
            { name: 'full_name', label: 'Họ tên thầy/cô' },
            { name: 'description', label: 'Vai trò', placeholder: 'VD: Giáo viên chủ nhiệm lớp ...' },
          ],
        },
        {
          name: 'homeroom_class',
          label: 'Giáo viên chủ nhiệm lớp',
        },
        {
          name: 'student_total',
          label: 'Sĩ số lớp',
          type: 'number',
        },
        {
          name: 'student_present',
          label: 'Có mặt',
          type: 'number',
        },
        {
          name: 'student_absent',
          label: 'Vắng mặt',
          type: 'number',
        },
        {
          name: 'student_excused',
          label: 'Có phép',
          type: 'number',
        },
        {
          name: 'student_unexcused',
          label: 'Không phép',
          type: 'number',
        },
      ],
    },
    {
      title: 'Chủ tọa, thư ký cuộc họp',
      fields: [
        {
          name: 'chair_name',
          label: 'Chủ tọa',
        },
        {
          name: 'secretary_name',
          label: 'Thư ký',
        },
      ],
    },
    {
      title: 'Nội dung cuộc họp',
      fields: [
        {
          name: 'candidate_list',
          label: 'Danh sách ứng cử viên ban cán sự',
          type: 'textarea',
          placeholder: 'Mỗi dòng một ứng cử viên',
        },
        {
          name: 'voting_method',
          label: 'Hình thức bầu',
          placeholder: 'Bỏ phiếu kín / biểu quyết công khai...',
        },
        {
          name: 'vote_results',
          label: 'Kết quả bầu',
          type: 'table',
          columns: [
            { name: 'full_name', label: 'Họ và tên' },
            { name: 'vote_count', label: 'Số phiếu bầu', type: 'number' },
            { name: 'ranking', label: 'Xếp hạng', type: 'number' },
          ],
        },
        {
          name: 'new_staff',
          label: 'Ban cán sự mới',
          type: 'table',
          columns: [
            { name: 'full_name', label: 'Họ và tên' },
            { name: 'position', label: 'Chức vụ' },
          ],
        },
        {
          name: 'staff_agreement',
          label: 'Nội dung ra mắt Ban cán sự mới',
          type: 'textarea',
          placeholder: 'Tập thể lớp ... nhất trí các thành viên sau nằm trong đội ngũ Ban cán sự lớp năm học ...',
        },
      ],
    },
    {
      title: 'Phát biểu',
      fields: [
        {
          name: 'staff_statement',
          label: 'Phát biểu của đại diện Ban cán sự lớp mới',
          type: 'textarea',
        },
        {
          name: 'teacher_statement',
          label: 'Phát biểu của giáo viên chủ nhiệm',
          type: 'textarea',
        },
      ],
    },
  ],

  3: [
    {
      title: 'Thông tin chung của mẫu',
      fields: [
        {
          name: 'school_name',
          label: 'Trường',
          placeholder: 'VD: Trường Trung học phổ thông ...',
        },
        {
          name: 'teachers',
          label: 'Thầy/Cô',
          type: 'table',
          columns: [
            { name: 'full_name', label: 'Họ tên thầy/cô', placeholder: 'Họ tên thầy/cô tham dự' },
            { name: 'description', label: 'Phụ trách môn', placeholder: 'VD: Toán / Ngữ văn / Chủ nhiệm' },
          ],
        },
        {
          name: 'chair_role',
          label: 'Vai trò chủ trì',
          placeholder: 'VD: Bí thư lớp',
        },
        {
          name: 'secretary_role',
          label: 'Vai trò thư ký',
          placeholder: 'VD: Lớp phó học tập',
        },
        {
          name: 'student_total',
          label: 'Sĩ số học sinh của lớp',
          type: 'number',
        },
        {
          name: 'student_present',
          label: 'Số học sinh có mặt',
          type: 'number',
        },
        {
          name: 'student_absent',
          label: 'Số học sinh vắng mặt',
          type: 'number',
        },
      ],
    },
    {
      title: 'Bình bầu lớp trưởng',
      fields: [
        {
          name: 'candidates',
          label: 'Học sinh gương mẫu được xét bình bầu',
          type: 'textarea',
          placeholder: 'Mỗi dòng một học sinh',
        },
        {
          name: 'vote_counts',
          label: 'Số phiếu bình bầu',
          type: 'textarea',
          placeholder: 'Ví dụ: Nguyễn Văn A: 35 phiếu',
        },
        {
          name: 'winner',
          label: 'Học sinh có số phiếu nhiều nhất',
        },
        {
          name: 'elected_student_opinion',
          label: 'Ý kiến của học sinh được bình bầu làm lớp trưởng',
          type: 'textarea',
        },
        {
          name: 'commitment',
          label: 'Lời cam đoan chấp hành nội quy trường, lớp và pháp luật',
          type: 'textarea',
        },
      ],
    },
    {
      title: 'Ý kiến và nhiệm vụ',
      fields: [
        {
          name: 'student_opinion',
          label: 'Ý kiến của học sinh trong lớp',
          type: 'textarea',
        },
        {
          name: 'teacher_opinion',
          label: 'Ý kiến của giáo viên chủ nhiệm',
          type: 'textarea',
        },
        {
          name: 'leader_tasks',
          label: 'Nhiệm vụ của lớp trưởng',
          type: 'textarea',
        },
        {
          name: 'leader_rights',
          label: 'Quyền của lớp trưởng',
          type: 'textarea',
        },
        {
          name: 'competition_direction',
          label: 'Phương hướng phấn đấu thi đua',
          type: 'textarea',
        },
        {
          name: 'teacher_direction',
          label: 'Ý kiến giáo viên chủ nhiệm chỉ đạo phương hướng thực hiện',
          type: 'textarea',
        },
        {
          name: 'class_competition_opinion',
          label: 'Ý kiến học sinh trong lớp cùng phấn đấu thi đua',
          type: 'textarea',
        },
        {
          name: 'copies_count',
          label: 'Số bản biên bản được lập',
          type: 'number',
          placeholder: 'VD: 2',
        },
      ],
    },
  ],

  4: [
    {
      title: 'Thông tin chung của mẫu',
      fields: [
        {
          name: 'school_name',
          label: 'Trường',
          placeholder: 'VD: Trường THPT ...',
        },
        {
          name: 'school_year',
          label: 'Năm học',
          placeholder: 'VD: 2025 - 2026',
        },
        {
          name: 'teachers',
          label: 'Thầy/Cô',
          type: 'table',
          columns: [
            { name: 'full_name', label: 'Họ tên thầy/cô', placeholder: 'Họ tên giáo viên chủ nhiệm' },
            { name: 'description', label: 'Vai trò', placeholder: 'VD: Giáo viên chủ nhiệm lớp' },
          ],
        },
        {
          name: 'chair_role',
          label: 'Vai trò chủ trì',
          placeholder: 'VD: Lớp trưởng',
        },
        {
          name: 'student_total',
          label: 'Sĩ số học sinh của lớp',
          type: 'number',
        },
        {
          name: 'student_present',
          label: 'Số học sinh có mặt',
          type: 'number',
        },
        {
          name: 'student_absent',
          label: 'Số học sinh vắng mặt',
          type: 'number',
        },
      ],
    },
    {
      title: 'Tổng kết cuối kì',
      fields: [
        {
          name: 'meeting_goal',
          label: 'Mục đích của cuộc họp',
          type: 'textarea',
        },
        {
          name: 'political_work',
          label: 'Điểm cần khắc phục trong công tác chính trị',
          type: 'textarea',
        },
        {
          name: 'teaching_work',
          label: 'Điểm cần khắc phục trong chuyên môn dạy học',
          type: 'textarea',
        },
        {
          name: 'teacher_assessment',
          label: 'Nhận định giáo viên hoàn thành',
          type: 'textarea',
        },
        {
          name: 'weak_student_support',
          label: 'Bồi dưỡng học sinh yếu kém',
          type: 'textarea',
        },
        {
          name: 'comments',
          label: 'Ý kiến đóng góp của giáo viên và học sinh',
          type: 'textarea',
        },
      ],
    },
  ],

  5: [
    {
      title: 'Thông tin chung của mẫu',
      fields: [
        {
          name: 'school_name',
          label: 'Trường',
          placeholder: 'VD: Trường THPT ...',
        },
        {
          name: 'teachers',
          label: 'Thầy/Cô',
          type: 'table',
          columns: [
            { name: 'full_name', label: 'Họ tên thầy/cô', placeholder: 'Họ tên giáo viên chủ nhiệm' },
            { name: 'description', label: 'Vai trò', placeholder: 'VD: Là chủ nhiệm lớp ...' },
          ],
        },
        {
          name: 'chair_role',
          label: 'Vai trò chủ trì',
          placeholder: 'VD: Lớp trưởng',
        },
        {
          name: 'secretary_role',
          label: 'Vai trò thư ký',
          placeholder: 'VD: Lớp phó học tập',
        },
        {
          name: 'student_total',
          label: 'Sĩ số học sinh của lớp',
          type: 'number',
        },
        {
          name: 'student_present',
          label: 'Số học sinh có mặt',
          type: 'number',
        },
        {
          name: 'student_absent',
          label: 'Số học sinh vắng mặt',
          type: 'number',
        },
      ],
    },
    {
      title: 'Nội dung vi phạm',
      fields: [
        {
          name: 'violations',
          label: 'Các lỗi vi phạm của học sinh',
          type: 'textarea',
          placeholder: 'VD: Tổ chức đánh nhau theo nhóm gây ra hậu quả nghiêm trọng',
        },
        {
          name: 'violation_analysis',
          label: 'Phân tích các lỗi của học sinh',
          type: 'textarea',
        },
        {
          name: 'violation_impacts',
          label: 'Hậu quả, ảnh hưởng của hành vi vi phạm',
          type: 'textarea',
          placeholder: 'Mỗi dòng một ý: gây thương tích, gây náo loạn, ảnh hưởng hình ảnh trường/lớp...',
        },
        {
          name: 'violating_student_opinion',
          label: 'Ý kiến của học sinh vi phạm',
          type: 'textarea',
        },
        {
          name: 'class_opinion',
          label: 'Ý kiến của một số học sinh trong lớp',
          type: 'textarea',
        },
      ],
    },
    {
      title: 'Biểu quyết về hình thức kỷ luật',
      fields: [
        {
          name: 'proposed_warning_students',
          label: 'Phê bình trước lớp, trước trường đối với học sinh',
          type: 'textarea',
          placeholder: 'Nhập danh sách học sinh bị đề xuất phê bình',
        },
        {
          name: 'proposed_warning_agree',
          label: 'Số học sinh đồng ý phê bình',
          type: 'number',
        },
        {
          name: 'proposed_warning_disagree',
          label: 'Số học sinh không đồng ý phê bình',
          type: 'number',
        },
        {
          name: 'proposed_reprimand_students',
          label: 'Khiển trách và thông báo với gia đình đối với học sinh',
          type: 'textarea',
          placeholder: 'Nhập danh sách học sinh bị đề xuất khiển trách',
        },
        {
          name: 'proposed_reprimand_agree',
          label: 'Số học sinh đồng ý khiển trách',
          type: 'number',
        },
        {
          name: 'proposed_reprimand_disagree',
          label: 'Số học sinh không đồng ý khiển trách',
          type: 'number',
        },
        {
          name: 'proposed_suspension_students',
          label: 'Buộc thôi học có thời hạn đối với học sinh',
          type: 'textarea',
          placeholder: 'Nhập danh sách học sinh bị đề xuất buộc thôi học có thời hạn',
        },
        {
          name: 'proposed_suspension_agree',
          label: 'Số học sinh đồng ý buộc thôi học có thời hạn',
          type: 'number',
        },
        {
          name: 'proposed_suspension_disagree',
          label: 'Số học sinh không đồng ý buộc thôi học có thời hạn',
          type: 'number',
        },
      ],
    },
    {
      title: 'Kết luận mức độ kỷ luật',
      fields: [
        {
          name: 'final_warning_students',
          label: 'Kết luận phê bình trước lớp, trước trường đối với học sinh',
          type: 'textarea',
        },
        {
          name: 'final_warning_agree',
          label: 'Số học sinh đồng ý kết luận phê bình',
          type: 'number',
        },
        {
          name: 'final_warning_disagree',
          label: 'Số học sinh không đồng ý kết luận phê bình',
          type: 'number',
        },
        {
          name: 'final_reprimand_students',
          label: 'Kết luận khiển trách và thông báo với gia đình đối với học sinh',
          type: 'textarea',
        },
        {
          name: 'final_reprimand_agree',
          label: 'Số học sinh đồng ý kết luận khiển trách',
          type: 'number',
        },
        {
          name: 'final_reprimand_disagree',
          label: 'Số học sinh không đồng ý kết luận khiển trách',
          type: 'number',
        },
        {
          name: 'final_suspension_students',
          label: 'Kết luận buộc thôi học có thời hạn đối với học sinh',
          type: 'textarea',
        },
        {
          name: 'final_suspension_agree',
          label: 'Số học sinh đồng ý kết luận buộc thôi học có thời hạn',
          type: 'number',
        },
        {
          name: 'final_suspension_disagree',
          label: 'Số học sinh không đồng ý kết luận buộc thôi học có thời hạn',
          type: 'number',
        },
        {
          name: 'teacher_notice',
          label: 'Lưu ý của giáo viên',
          type: 'textarea',
        },
      ],
    },
  ],

  6: [
    {
      title: 'Thông tin chung của mẫu',
      fields: [
        {
          name: 'school_name',
          label: 'Trường',
          placeholder: 'VD: Trường THPT ...',
        },
        {
          name: 'meeting_time_text',
          label: 'Thời gian',
          placeholder: 'VD: 8 giờ 00 phút, ngày 05 tháng 9 năm 2025',
        },
        {
          name: 'meeting_location_text',
          label: 'Địa điểm',
          placeholder: 'VD: Phòng học lớp 10A1',
        },
      ],
    },
    {
      title: 'Thành phần và điều hành cuộc họp',
      fields: [
        {
          name: 'teachers',
          label: 'Thầy/Cô giáo',
          type: 'table',
          columns: [
            { name: 'full_name', label: 'Họ tên thầy/cô', placeholder: 'Họ tên thầy/cô tham dự' },
            { name: 'description', label: 'Vai trò', placeholder: 'VD: Giáo viên chủ nhiệm / giáo viên bộ môn' },
          ],
        },
        {
          name: 'chair_name',
          label: 'Chủ tọa',
          placeholder: 'Họ tên chủ tọa cuộc họp',
        },
        {
          name: 'secretary_name',
          label: 'Thư ký',
          placeholder: 'Họ tên thư ký cuộc họp',
        },
      ],
    },
    {
      title: 'Nội dung đầu năm học',
      fields: [
        {
          name: 'meeting_agenda',
          label: 'Nội dung cuộc họp',
          type: 'textarea',
        },
        {
          name: 'meeting_progress',
          label: 'Diễn biến cuộc họp',
          type: 'textarea',
        },
      ],
    },
  ],

  7: [
    {
      title: 'Thông tin chung',
      fields: [
        {
          name: 'school_name',
          label: 'Trường',
          placeholder: 'VD: Trường THPT ...',
        },
        {
          name: 'teachers',
          label: 'Thầy/Cô tham dự',
          type: 'table',
          columns: [
            { name: 'full_name', label: 'Họ tên', placeholder: 'Họ tên thầy/cô' },
            { name: 'description', label: 'Vai trò / Ghi chú', placeholder: 'VD: Giáo viên chủ nhiệm / Đại diện ban giám hiệu' },
          ],
        },
        {
          name: 'copies_count',
          label: 'Số bản biên bản được lập',
          type: 'number',
          placeholder: 'VD: 2',
        },
      ],
    },
  ],
}

export const STRUCTURED_TEMPLATE_DEFAULT_DATA: Record<
  number,
  Record<string, unknown>
> = {
  1: {
    chair_role: 'Lớp trưởng',
    copies_count: 3,
  },

  2: {
    vote_results: [{}],
    new_staff: [{}],
    staff_statement:
      'Thay mặt ban cán sự lớp năm học mới, em xin chân thành cảm ơn sự tin tưởng của cô và các bạn. Em xin hứa sẽ cố gắng hoàn thành tốt nhiệm vụ được giao.',

    teacher_statement:
      'Cô hy vọng ban cán sự mới tiếp tục phát huy điểm mạnh, hỗ trợ tập thể lớp học tập và rèn luyện tốt hơn.',
  },

  3: {
    chair_role: 'Bí thư lớp',
    secretary_role: 'Lớp phó học tập',
    leader_tasks:
      'Theo dõi tình hình chung của cả lớp\nBáo cáo sĩ số từng buổi học\nTổng hợp kết quả thi đua\nTriển khai hoạt động theo chỉ đạo của giáo viên, nhà trường',

    leader_rights:
      'Được ưu tiên trong tính điểm rèn luyện\nĐược xét trao giấy khen nếu tập thể lớp đạt danh hiệu học tập và rèn luyện tốt',
    commitment: 'Chấp hành nội quy trường, lớp và pháp luật.',
    copies_count: 2,
  },

  4: {
    chair_role: 'Lớp trưởng',
  },

  5: {
    chair_role: 'Lớp trưởng',
    secretary_role: 'Lớp phó học tập',
    violations:
      'Tổ chức đánh nhau theo nhóm gây ra hậu quả nghiêm trọng',
    violation_analysis:
      'Tổ chức đánh nhau theo nhóm là một trong những hành vi bạo lực học đường và gây ra hậu quả nghiêm trọng cụ thể.',
    violation_impacts:
      'Gây ra thương tích cho học sinh cụ thể\nGây ra sự náo loạn trong lớp học, ảnh hưởng tới việc học tập và hoạt động chung của lớp\nẢnh hưởng tới hình ảnh trường học nói chung và lớp học nói riêng',
    violating_student_opinion:
      'Nội dung trên hoàn toàn đúng với thực trạng đã xảy ra, chúng em xin hoàn toàn chịu trách nhiệm trước lớp, trường học và pháp luật về hành vi vi phạm nghiêm trọng trên.\nEm xin hứa sẽ đưa ra các biện pháp khắc phục hậu quả, cam đoan không tái phạm.',
    class_opinion:
      'Xử lý đúng nội quy, quy định tại lớp, trường học và theo quy định pháp luật.',
    teacher_notice:
      'Tránh lặp lại tình trạng vi phạm trên, ban cán sự lớp cùng các học sinh trong lớp cần tự ý thức việc chấp hành các quy định nội quy của trường học. Nếu có biểu hiện tụ tập bàn bạc đánh nhau, cần báo lên ban cán sự lớp hoặc giáo viên chủ nhiệm để kịp thời xử lý.',
  },

  6: {
    meeting_agenda:
      'Triển khai các nội dung đầu năm học, phổ biến kế hoạch học tập, nề nếp lớp học và các nhiệm vụ trọng tâm của tập thể lớp.',
    meeting_progress:
      'Giáo viên và ban cán sự lớp trao đổi các nội dung cần thực hiện trong năm học mới. Tập thể lớp thống nhất thực hiện nghiêm túc nội quy trường, lớp và phối hợp xây dựng môi trường học tập tích cực.',
  },
}

export function getMinuteTemplate(typeId?: number) {
  if (!typeId) return undefined
  return MINUTE_TEMPLATE_DEFAULTS[typeId]
}

export function getStructuredTemplateDefaults(typeId?: number) {
  if (!typeId) return {}
  return JSON.parse(JSON.stringify(STRUCTURED_TEMPLATE_DEFAULT_DATA[typeId] || {}))
}

export function buildStructuredMinuteContent(
  typeId?: number,
  data?: Record<string, any>
) {
  if (typeId === 7) return ''

  const sections = typeId
    ? STRUCTURED_TEMPLATE_SECTIONS[typeId]
    : undefined

  if (!sections?.length || !data) return ''

  return sections
    .map((section) => {
      const lines = section.fields
        .map((field) => {
          const value = data[field.name]

          if (value === undefined || value === null || value === '') {
            return ''
          }

          if (field.type === 'table' && Array.isArray(value)) {
            if (field.name === 'teachers') {
              const teachers = value
                .map((row) => {
                  if (typeof row === 'string') return row.trim()
                  const fullName = String(row?.full_name || '').trim()
                  const description = String(row?.description || '').trim()
                  if (!fullName && !description) return ''
                  return description ? `${fullName} - ${description}` : fullName
                })
                .filter(Boolean)

              if (!teachers.length) return ''
              return `${field.label}:\n${teachers
                .map((teacher, index) => `${index + 1}. ${teacher}`)
                .join('\n')}`
            }

            const rows = value
              .filter((row) => (field.columns || []).some((column) => row?.[column.name]))
              .map((row, index) => {
                const cells = (field.columns || [])
                  .map((column) => `${column.label}: ${row?.[column.name] || ''}`)
                  .join('; ')
                return `${index + 1}. ${cells}`
              })

            if (!rows.length) return ''
            return `${field.label}:\n${rows.join('\n')}`
          }

          return `${field.label}:\n${String(value).trim()}`
        })
        .filter(Boolean)

      if (!lines.length) return ''

      return `${section.title}\n${lines.join('\n\n')}`
    })
    .filter(Boolean)
    .join('\n\n')
}

export function buildDefaultMinuteCode(typeId?: number) {
  const suffix = typeId
    ? String(typeId).padStart(2, '0')
    : '00'

  return `BB-${dayjs().format('YYYYMMDD')}-${suffix}`
}

export function getMinuteTypeName(
  typeId?: number,
  fallback?: string
) {
  if (!typeId) return fallback || ''
  return MINUTE_TYPE_NAMES[typeId] || fallback || ''
}

export function splitLines(value?: string) {
  return (value || '')
    .split('\n')
    .filter((line) => line.trim().length > 0)
}

export function getAttendanceSummary(
  minute: Partial<MeetingMinute>
) {
  const participants = minute.participants || []

  const present = participants.filter(
    (item) => item.attendance_status === 'present'
  ).length

  const absent = participants.filter(
    (item) => item.attendance_status === 'absent'
  ).length

  return {
    total: participants.length || '......',

    present:
      minute.attendee_summary ||
      (participants.length
        ? `${present} bạn`
        : '...... bạn'),

    absent:
      minute.absentee_summary ||
      (participants.length
        ? `${absent} bạn`
        : '...... bạn'),
  }
}

export function getPrintableMinuteDate(
  minute: Partial<MeetingMinute>
) {
  return minute.meeting_date
    ? formatDate(minute.meeting_date)
    : '...... tháng ...... năm ........'
}

export function getPrintableMinuteTime(
  minute: Partial<MeetingMinute>
) {
  const start = minute.start_time
    ? formatTime(minute.start_time)
    : '...... giờ ...... phút'

  const end = minute.end_time
    ? formatTime(minute.end_time)
    : '...... giờ ...... phút'

  return { start, end }
}
