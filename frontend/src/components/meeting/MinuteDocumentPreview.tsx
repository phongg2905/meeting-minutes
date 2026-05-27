import { Table } from 'antd'
import type React from 'react'
import { MeetingMinute } from '../../types'
import {
  getAttendanceSummary,
  getMinuteTypeName,
  getPrintableMinuteDate,
  getPrintableMinuteTime,
  splitLines,
} from '../../utils/minuteTemplates'

type Props = {
  minute: Partial<MeetingMinute>
  typeName?: string
}

const documentStyle: React.CSSProperties = {
  background: '#fff',
  color: '#111',
  maxWidth: 820,
  margin: '0 auto',
  padding: '28px 36px',
  border: '1px solid #e5e7eb',
  fontFamily: '"Times New Roman", serif',
  fontSize: 15,
  lineHeight: 1.45,
}

const labelStyle: React.CSSProperties = { fontWeight: 700, margin: '12px 0 6px' }
const dottedStyle: React.CSSProperties = {
  borderBottom: '1px dotted #555',
  minHeight: 20,
  whiteSpace: 'pre-wrap',
}

function text(value: unknown, fallback = '................................') {
  if (value === undefined || value === null || value === '') return fallback
  return String(value)
}

function teacherText(
  data: Record<string, any>,
  fallback = '................................',
  defaultDescription = '',
  descriptionPrefix = ''
) {
  const teachers = Array.isArray(data.teachers)
    ? data.teachers
      .map((item) => {
        if (typeof item === 'string') return item.trim()
        const fullName = String(item?.full_name || '').trim()
        const rawDescription = String(item?.description || '').trim()
        const description = rawDescription && descriptionPrefix
          ? `${descriptionPrefix} ${rawDescription}`
          : String(rawDescription || defaultDescription || '').trim()
        if (!fullName && !description) return ''
        return description ? `${fullName} - ${description}` : fullName
      })
      .filter(Boolean)
    : []

  if (teachers.length) return teachers.join('; ')
  if (data.teacher_name) {
    const description = defaultDescription.trim()
    return description
      ? `${text(data.teacher_name, fallback)} - ${description}`
      : text(data.teacher_name, fallback)
  }
  return text(data.teacher_name, fallback)
}

function TextBlock({ value, minLines = 2 }: { value?: string; minLines?: number }) {
  const lines = splitLines(value)
  if (!lines.length) {
    return (
      <>
        {Array.from({ length: minLines }).map((_, index) => (
          <div key={index} style={dottedStyle} />
        ))}
      </>
    )
  }

  return <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>{value}</div>
}

function SignatureRow({ labels }: { labels: string[] }) {
  return (
    <div className="signature-row" style={{ display: 'grid', gridTemplateColumns: `repeat(${labels.length}, 1fr)`, gap: 16, marginTop: 28, textAlign: 'center' }}>
      {labels.map((label) => (
        <div key={label}>
          <div style={{ fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
          <div style={{ fontStyle: 'italic', marginTop: 8 }}>(Ký và ghi rõ họ tên)</div>
        </div>
      ))}
    </div>
  )
}

function Header() {
  return (
    <div style={{ textAlign: 'center', fontWeight: 700 }}>
      <div>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
      <div>Độc lập - Tự do - Hạnh phúc</div>
      <div style={{ marginTop: 18 }}>BIÊN BẢN HỌP LỚP</div>
    </div>
  )
}

function ResultTable({ columns }: { columns: string[] }) {
  return (
    <Table
      bordered
      pagination={false}
      size="small"
      dataSource={[1, 2, 3, 4].map((key) => ({ key }))}
      columns={columns.map((title) => ({ title, dataIndex: title, key: title, render: () => '' }))}
      style={{ margin: '8px 0 12px' }}
    />
  )
}

function DynamicPreviewTable({
  columns,
  rows,
  minRows = 1,
}: {
  columns: { key: string; title: string }[]
  rows?: Record<string, any>[]
  minRows?: number
}) {
  const safeRows = rows?.length ? rows : Array.from({ length: minRows }).map(() => ({}))

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', margin: '8px 0 12px' }}>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key} style={{ border: '1px solid #111', padding: '8px 10px', textAlign: 'center' }}>
              {column.title}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {safeRows.map((row, index) => (
          <tr key={index}>
            {columns.map((column) => (
              <td key={column.key} style={{ border: '1px solid #111', padding: '8px 10px', minHeight: 30 }}>
                {row?.[column.key] || ''}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function DetailedClassMeetingPreview({ minute }: { minute: Partial<MeetingMinute> }) {
  const data = minute.template_data || {}
  const time = getPrintableMinuteTime(minute)

  return (
    <div className="minute-document" style={documentStyle}>
      <Header />

      <div style={{ marginTop: 22 }}>
        <div>Hôm nay, ngày {getPrintableMinuteDate(minute)}</div>
        <div>Tại phòng: {minute.location || '........................................................................'}</div>
        <div>
          Lớp: {minute.class_name || '................'} Trường {text(data.school_name, '................................................')}
        </div>
        <div>
          Tổ chức họp lớp để triển khai một số công việc nhằm phục vụ cho năm học {text(data.school_year, '........')}
        </div>
      </div>

      <div style={labelStyle}>I. Thành phần tham dự:</div>
      <div>
        1. Thầy (Cô): {teacherText(data, '................................', 'Phụ trách môn ..........', 'Phụ trách môn')}
      </div>
      <div>
        2. Chủ trì cuộc họp: {minute.host_name || '................................'} - {text(data.chair_role, 'Lớp trưởng')}
      </div>
      <div>3. Thư ký cuộc họp: {minute.secretary_name || '................................'}</div>
      <div>
        4. Sĩ số học sinh của lớp: {text(data.student_total, '........')} bạn; có mặt {text(data.student_present, '........')} bạn; vắng mặt {text(data.student_absent, '........')} bạn
      </div>

      <div style={labelStyle}>II. Nội dung:</div>
      <div style={{ marginTop: 8 }}>
        <span>1) Mặt mạnh </span>
        <span style={{ fontStyle: 'italic' }}>
          (thực hiện quy chế, nội quy; những hoạt động triển khai thực hiện có hiệu quả; cá nhân tiêu biểu)
        </span>
      </div>
      <TextBlock value={String(data.strengths || '')} minLines={3} />

      <div style={{ marginTop: 12 }}>
        <span>2) Mặt yếu </span>
        <span style={{ fontStyle: 'italic' }}>
          (vi phạm quy chế, nội quy: đạo đức, tác phong; lối sống, lên lớp, tham gia giao thông; khi thi, kiểm tra; số học sinh hay bỏ học)
        </span>
      </div>
      <TextBlock value={String(data.weaknesses || '')} minLines={3} />

      <div style={{ marginTop: 12 }}>
        3) Tinh thần trách nhiệm của cán bộ lớp {text(data.class_staff_responsibility, '........')}
      </div>
      {!data.class_staff_responsibility && <TextBlock minLines={3} />}

      <div style={labelStyle}>III. Ý kiến góp ý:</div>
      <TextBlock value={String(data.comments || '')} minLines={3} />

      <div style={labelStyle}>IV. Đề xuất kiến nghị:</div>
      <TextBlock value={String(data.recommendations || '')} minLines={3} />

      <div style={{ marginTop: 18 }}>
        Biên bản kết thúc vào hồi {time.end} cùng ngày.
      </div>
      <div>Biên bản được in thành {text(data.copies_count, '03')} bản có giá trị như nhau.</div>

      <SignatureRow labels={['Chủ trì', 'Thư ký']} />
    </div>
  )
}

function StaffElectionPreview({ minute }: { minute: Partial<MeetingMinute> }) {
  const data = minute.template_data || {}
  const time = getPrintableMinuteTime(minute)
  const chairName = String(data.chair_name || minute.host_name || '')
  const secretaryName = String(data.secretary_name || minute.secretary_name || '')

  return (
    <div className="minute-document" style={documentStyle}>
      <Header />

      <div style={labelStyle}>1. Thời gian, địa điểm, mục đích tổ chức cuộc họp:</div>
      <div>- Thời gian: {text(data.meeting_time_text, '................................................................')}</div>
      <div>- Địa điểm: {text(data.meeting_location_text || minute.location, '............................................................')}</div>
      <div>
        - Mục đích: {text(data.meeting_purpose, `Bình bầu ban cán sự lớp ${minute.class_name || '..........'} năm học ${text(data.school_year, '................................')}`)}
      </div>

      <div style={labelStyle}>2. Thành phần tham dự:</div>
      <div>
        - Thầy / Cô: {teacherText(data, '........................................', `Giáo viên chủ nhiệm lớp ${text(data.homeroom_class || minute.class_name, '................')}`)}
      </div>
      <div>
        - Sĩ số lớp: {text(data.student_total, '........')} bạn. Có mặt: {text(data.student_present, '........')} Vắng mặt: {text(data.student_absent, '........')} Có phép: {text(data.student_excused, '........')} Không phép: {text(data.student_unexcused, '........')}
      </div>

      <div style={labelStyle}>3. Chủ tọa, thư ký cuộc họp:</div>
      <div>- Chủ tọa: {text(chairName, '............................................................')}</div>
      <div>- Thư ký: {text(secretaryName, '............................................................')}</div>

      <div style={labelStyle}>4. Nội dung cuộc họp:</div>
      <div style={{ fontStyle: 'italic', marginTop: 8 }}>4.1. Danh sách ứng cử viên ban cán sự</div>
      <TextBlock value={String(data.candidate_list || '')} minLines={5} />

      <div style={{ fontStyle: 'italic', marginTop: 12 }}>
        4.2. Hình thức bầu: {text(data.voting_method, '............................................................')}
      </div>

      <div style={{ fontStyle: 'italic', marginTop: 12 }}>4.3. Kết quả bầu:</div>
      <DynamicPreviewTable
        columns={[
          { key: 'full_name', title: 'Họ và tên' },
          { key: 'vote_count', title: 'Số phiếu bầu' },
          { key: 'ranking', title: 'Xếp hạng' },
        ]}
        rows={Array.isArray(data.vote_results) ? data.vote_results : undefined}
        minRows={4}
      />

      <div style={{ fontStyle: 'italic', marginTop: 12 }}>4.4. Ra mắt Ban cán sự mới:</div>
      <div>
        - {text(data.staff_agreement, `Tập thể lớp ${minute.class_name || '..........'} nhất trí các thành viên sau nằm trong đội ngũ Ban cán sự lớp năm học ${text(data.school_year, '................')}`)}
      </div>
      <DynamicPreviewTable
        columns={[
          { key: 'full_name', title: 'Họ và tên' },
          { key: 'position', title: 'Chức vụ' },
        ]}
        rows={Array.isArray(data.new_staff) ? data.new_staff : undefined}
        minRows={3}
      />

      <div>- Phát biểu của đại diện Ban cán sự lớp mới:</div>
      <TextBlock value={String(data.staff_statement || '')} minLines={3} />

      <div style={{ marginTop: 10 }}>- Phát biểu của giáo viên chủ nhiệm:</div>
      <TextBlock value={String(data.teacher_statement || '')} minLines={3} />

      <div style={{ marginTop: 18 }}>Cuộc họp kết thúc vào hồi {time.end} cùng ngày.</div>
      <SignatureRow labels={['Chủ tọa', 'Thư ký', 'Giáo viên chủ nhiệm']} />
    </div>
  )
}

function BulletTextBlock({ value, minLines = 5 }: { value?: string; minLines?: number }) {
  const lines = splitLines(value)

  if (!lines.length) {
    return (
      <ul style={{ margin: '6px 0 10px 20px', padding: 0 }}>
        {Array.from({ length: minLines }).map((_, index) => (
          <li key={index} style={{ listStylePosition: 'outside' }}>
            <span style={{ display: 'inline-block', minWidth: 260, borderBottom: '1px dotted #555' }} />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <ul style={{ margin: '6px 0 10px 20px', padding: 0 }}>
      {lines.map((line, index) => (
        <li key={index}>{line}</li>
      ))}
    </ul>
  )
}

function ClassLeaderElectionPreview({ minute }: { minute: Partial<MeetingMinute> }) {
  const data = minute.template_data || {}
  const time = getPrintableMinuteTime(minute)

  return (
    <div className="minute-document" style={documentStyle}>
      <Header />

      <div style={{ marginTop: 22 }}>
        <div>Hôm nay, ngày {getPrintableMinuteDate(minute)}</div>
        <div>Tại phòng học: {minute.location || '................................................'}</div>
        <div>
          Lớp {minute.class_name || '..........'} Trường Trung học phổ thông {text(data.school_name, '....................')}
        </div>
        <div>Tổ chức họp lớp để triển khai một số nội dung để bình bầu lớp trưởng</div>
      </div>

      <div style={labelStyle}>I. Thành phần tham dự:</div>
      <div>
        1/ Thầy (Cô): {teacherText(data, '................................', 'Phụ trách môn ................', 'Phụ trách môn')}
      </div>
      <div>
        2/ Chủ trì cuộc họp: {minute.host_name || '................................'} - Là {text(data.chair_role, 'Bí thư lớp')}
      </div>
      <div>
        3/ Thư ký cuộc họp: {minute.secretary_name || '................................'} - Là {text(data.secretary_role, 'lớp phó học tập')}
      </div>
      <div>
        4/ Sĩ số học sinh của lớp: {text(data.student_total, '...')} bạn; có mặt {text(data.student_present, '...')} bạn; vắng mặt {text(data.student_absent, '...')} bạn
      </div>

      <div style={labelStyle}>II. Nội dung:</div>
      <div>1/ Các học sinh gương mẫu được xét bình bầu:</div>
      <BulletTextBlock value={String(data.candidates || '')} minLines={7} />

      <div>2/ Số phiếu bình bầu:</div>
      <BulletTextBlock value={String(data.vote_counts || '')} minLines={7} />

      <div style={{ marginTop: 8 }}>3/ Kết quả:</div>
      <div style={{ marginTop: 8 }}>
        Học sinh: {text(data.winner, '........................')} là học sinh có số phiếu bầu nhiều nhất.
      </div>

      <div style={{ marginTop: 12 }}>4/ Ý kiến của học sinh trong lớp và giáo viên chủ nhiệm</div>
      <div>- Ý kiến của học sinh trong lớp: {text(data.student_opinion, '........................')}</div>
      <div>- Giáo viên chủ nhiệm: {text(data.teacher_opinion, '........................')}</div>

      <div style={{ marginTop: 8 }}>+ Nhiệm vụ của lớp trưởng:</div>
      <BulletTextBlock value={String(data.leader_tasks || '')} minLines={6} />

      <div>+ Quyền của lớp trưởng</div>
      <BulletTextBlock value={String(data.leader_rights || '')} minLines={4} />

      <div style={{ marginTop: 8 }}>5/ Ý kiến của học sinh được bình bầu làm lớp trưởng:</div>
      <TextBlock value={String(data.elected_student_opinion || '')} minLines={1} />

      <div style={{ marginTop: 8 }}>+ Lời cam đoan về việc chấp hành nội quy trường, lớp và pháp luật.</div>
      <TextBlock value={String(data.commitment || '')} minLines={1} />

      <div style={labelStyle}>III. Ý kiến góp ý:</div>
      <div>
        - Ý kiến của giáo viên chủ nhiệm chỉ đạo về phương hướng thực hiện của lớp trong thời gian tới:
      </div>
      <TextBlock value={String(data.teacher_direction || data.competition_direction || '')} minLines={1} />
      <div>- Ý kiến của học sinh trong lớp cùng nhau phấn đấu thi đua:</div>
      <TextBlock value={String(data.class_competition_opinion || '')} minLines={1} />

      <div style={{ marginTop: 12 }}>Kết thúc vào {time.end}.</div>
      <div>Biên bản này được in thành {text(data.copies_count, '...')} bản và có giá trị như nhau.</div>

      <SignatureRow labels={['Chủ trì', 'Thư ký']} />
    </div>
  )
}

function SemesterSummaryPreview({ minute }: { minute: Partial<MeetingMinute> }) {
  const data = minute.template_data || {}
  const time = getPrintableMinuteTime(minute)

  return (
    <div className="minute-document" style={documentStyle}>
      <Header />

      <div style={{ marginTop: 22 }}>
        <div>Hôm nay, ngày {getPrintableMinuteDate(minute)}</div>
        <div>Tại phòng {minute.location || '................................................'}</div>
        <div>
          Lớp {minute.class_name || '......'} Trường {text(data.school_name, '................................................')}
        </div>
        <div>
          Tổ chức họp lớp để triển khai một số công việc nhằm phục vụ cho năm học {text(data.school_year, '................')}
        </div>
      </div>

      <div style={labelStyle}>I/ Thành phần tham dự:</div>
      <div>
        1/ Thầy (Cô): {teacherText(data, '................................', 'Giáo viên chủ nhiệm lớp')}
      </div>
      <div>
        2/ Chủ trì cuộc họp: {minute.host_name || '................................'} - Là {text(data.chair_role, 'lớp trưởng')}
      </div>
      <div>3/ Thư ký cuộc họp: {minute.secretary_name || '................................'}</div>
      <div>
        4/ Sĩ số học sinh của lớp: {text(data.student_total, '......')} bạn; có mặt {text(data.student_present, '......')} bạn; vắng mặt {text(data.student_absent, '......')} bạn
      </div>

      <div style={labelStyle}>II/ Nội dung:</div>
      <div>1/ Mục đích của cuộc họp</div>
      <TextBlock value={String(data.meeting_goal || '')} minLines={2} />

      <div style={{ marginTop: 12 }}>2/ Những điểm cần được khắc phục</div>
      <div style={{ marginTop: 8 }}>- Trong công tác chính trị</div>
      <TextBlock value={String(data.political_work || '')} minLines={1} />
      <div>- Trong chuyên môn dạy học</div>
      <TextBlock value={String(data.teaching_work || '')} minLines={1} />
      <div>- Nhận định giáo viên hoàn thành</div>
      <TextBlock value={String(data.teacher_assessment || '')} minLines={1} />
      <div>- Nội dung của việc bồi dưỡng những học sinh yếu kém</div>
      <TextBlock value={String(data.weak_student_support || '')} minLines={1} />
      <div>- Các ý kiến đóng góp của giáo viên và học sinh</div>
      <TextBlock value={String(data.comments || '')} minLines={1} />

      <div style={{ marginTop: 18 }}>
        Biên bản kết thúc vào {time.end} cùng ngày
      </div>

      <div className="signature-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 20, textAlign: 'center' }}>
        {['Giáo viên chủ nhiệm', 'Chủ tọa', 'Thư ký'].map((label) => (
          <div key={label}>
            <div style={{ fontWeight: 700 }}>{label}</div>
            <div style={{ fontStyle: 'italic', marginTop: 8 }}>(Nếu ý kiến, ký và ghi rõ họ tên)</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function VoteSection({
  title,
  students,
  agree,
  disagree,
}: {
  title: string
  students?: unknown
  agree?: unknown
  disagree?: unknown
}) {
  return (
    <>
      <div style={{ marginTop: 10 }}>- {title}:</div>
      <TextBlock value={String(students || '')} minLines={1} />
      <ul style={{ margin: '6px 0 8px 24px', padding: 0 }}>
        <li>Đồng ý: {text(agree, '...')} học sinh</li>
        <li>Không đồng ý: {text(disagree, '...')} học sinh</li>
      </ul>
    </>
  )
}

function StudentDisciplinePreview({ minute }: { minute: Partial<MeetingMinute> }) {
  const data = minute.template_data || {}

  return (
    <div className="minute-document" style={documentStyle}>
      <Header />

      <div style={{ textAlign: 'right', marginTop: 18, fontStyle: 'italic' }}>
        .........., ngày ... tháng ... năm 20....
      </div>

      <div style={{ marginTop: 14 }}>
        <div>
          Tại phòng học Lớp {minute.class_name || '..........'} Trường {text(data.school_name, '................................................')}
        </div>
        <div>Tổ chức họp lớp để triển khai một số nội dung về việc xét kỷ luật học sinh vi phạm.</div>
      </div>

      <div style={labelStyle}>I. Thành phần tham dự:</div>
      <div>
        1/ Thầy (Cô): {teacherText(data, '................................', `Là chủ nhiệm lớp ${minute.class_name || '..........'}`)}
      </div>
      <div>
        2/ Chủ trì cuộc họp: {minute.host_name || '................................'} - Là {text(data.chair_role, 'Lớp trưởng')}
      </div>
      <div>
        3/ Thư ký cuộc họp: {minute.secretary_name || '................................'} - Là {text(data.secretary_role, 'Lớp phó học tập')}
      </div>
      <div>
        4/ Sĩ số học sinh của lớp: {text(data.student_total, '.....')} bạn; có mặt {text(data.student_present, '.....')} bạn; Vắng mặt {text(data.student_absent, '.....')} bạn
      </div>

      <div style={labelStyle}>II. Nội dung:</div>
      <div>1/ Các lỗi vi phạm của học sinh</div>
      <TextBlock value={String(data.violations || '')} minLines={1} />

      <div style={{ marginTop: 10 }}>2/ Phân tích các lỗi của học sinh</div>
      <TextBlock value={String(data.violation_analysis || '')} minLines={1} />
      <BulletTextBlock value={String(data.violation_impacts || '')} minLines={4} />

      <div style={{ marginTop: 10 }}>3/ Ý kiến của học sinh vi phạm</div>
      <TextBlock value={String(data.violating_student_opinion || '')} minLines={2} />

      <div style={{ marginTop: 10 }}>4/ Ý kiến của một số học sinh trong lớp</div>
      <TextBlock value={String(data.class_opinion || '')} minLines={1} />

      <div style={{ marginTop: 10 }}>5/ Biểu quyết về hình thức kỷ luật đối với học sinh:</div>
      <VoteSection
        title="Phê bình trước lớp, trước trường đối với học sinh sau đây"
        students={data.proposed_warning_students}
        agree={data.proposed_warning_agree}
        disagree={data.proposed_warning_disagree}
      />
      <VoteSection
        title="Khiển trách và thông báo với gia đình"
        students={data.proposed_reprimand_students}
        agree={data.proposed_reprimand_agree}
        disagree={data.proposed_reprimand_disagree}
      />
      <VoteSection
        title="Buộc thôi học có thời hạn"
        students={data.proposed_suspension_students}
        agree={data.proposed_suspension_agree}
        disagree={data.proposed_suspension_disagree}
      />

      <div style={{ marginTop: 10 }}>6/ Kết luận mức độ kỷ luật đối với học sinh:</div>
      <VoteSection
        title="Phê bình trước lớp, trước trường đối với học sinh sau đây"
        students={data.final_warning_students}
        agree={data.final_warning_agree}
        disagree={data.final_warning_disagree}
      />
      <VoteSection
        title="Khiển trách và thông báo với gia đình"
        students={data.final_reprimand_students}
        agree={data.final_reprimand_agree}
        disagree={data.final_reprimand_disagree}
      />
      <VoteSection
        title="Buộc thôi học có thời hạn"
        students={data.final_suspension_students}
        agree={data.final_suspension_agree}
        disagree={data.final_suspension_disagree}
      />

      <div style={labelStyle}>III. Lưu ý của giáo viên</div>
      <TextBlock value={String(data.teacher_notice || '')} minLines={3} />

      <SignatureRow labels={['Giáo viên chủ nhiệm', 'Lớp trưởng', 'Thư ký']} />
    </div>
  )
}

function OpeningSchoolYearPreview({ minute }: { minute: Partial<MeetingMinute> }) {
  const data = minute.template_data || {}
  const time = getPrintableMinuteTime(minute)
  const meetingTime = data.meeting_time_text
    ? String(data.meeting_time_text)
    : `${time.start}, ngày ${getPrintableMinuteDate(minute)}`
  const meetingLocation = data.meeting_location_text || minute.location
  const chairName = data.chair_name || minute.host_name
  const secretaryName = data.secretary_name || minute.secretary_name

  return (
    <div className="minute-document" style={documentStyle}>
      <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: 24 }}>
        <div style={{ textAlign: 'center', fontWeight: 700 }}>
          <div>Trường {text(data.school_name, '............................')}</div>
          <div style={{ marginTop: 12 }}>Lớp {minute.class_name || '........................'}</div>
        </div>
        <div style={{ textAlign: 'center', fontWeight: 700 }}>
          <div>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
          <div>Độc lập - Tự do - Hạnh phúc</div>
          <div>--------------------------------</div>
        </div>
      </div>

      <div style={{ textAlign: 'center', fontWeight: 700, marginTop: 42 }}>
        BIÊN BẢN HỌP LỚP
      </div>

      <div style={labelStyle}>1. Thời gian, địa điểm họp</div>
      <div>- Thời gian: {meetingTime}</div>
      <div>- Địa điểm: {text(meetingLocation, '............................................................')}</div>

      <div style={labelStyle}>2. Thành phần tham dự:</div>
      <div>- Thầy / Cô giáo: {teacherText(data, '............................................................')}</div>

      <div style={labelStyle}>3. Chủ tọa, thư ký cuộc họp</div>
      <div>- Chủ tọa: {text(chairName, '............................................................')}</div>
      <div>- Thư ký: {text(secretaryName, '............................................................')}</div>

      <div style={labelStyle}>4. Nội dung cuộc họp.</div>
      <TextBlock value={String(data.meeting_agenda || '')} minLines={2} />

      <div style={labelStyle}>5. Diễn biến cuộc họp</div>
      <TextBlock value={String(data.meeting_progress || '')} minLines={2} />

      <div style={{ marginTop: 18 }}>
        Cuộc họp kết thúc vào lúc {time.end} cùng ngày.
      </div>

      <SignatureRow labels={['Thư ký', 'Chủ tọa']} />
    </div>
  )
}

export default function MinuteDocumentPreview({ minute, typeName }: Props) {
  if (minute.type_id === 1) {
    return <DetailedClassMeetingPreview minute={minute} />
  }

  if (minute.type_id === 2) {
    return <StaffElectionPreview minute={minute} />
  }

  if (minute.type_id === 3) {
    return <ClassLeaderElectionPreview minute={minute} />
  }

  if (minute.type_id === 4) {
    return <SemesterSummaryPreview minute={minute} />
  }

  if (minute.type_id === 5) {
    return <StudentDisciplinePreview minute={minute} />
  }

  if (minute.type_id === 6) {
    return <OpeningSchoolYearPreview minute={minute} />
  }

  const attendance = getAttendanceSummary(minute)
  const time = getPrintableMinuteTime(minute)
  const resolvedTypeName = getMinuteTypeName(minute.type_id, typeName)
  const signatureLabels = minute.type_id === 2
    ? ['Chủ tọa', 'Thư ký', 'Giáo viên chủ nhiệm']
    : minute.type_id === 4 || minute.type_id === 5
      ? ['Giáo viên chủ nhiệm', 'Chủ tọa', 'Thư ký']
      : ['Chủ trì', 'Thư ký']

  return (
    <div className="minute-document" style={documentStyle}>
      <Header />

      {resolvedTypeName && (
        <div style={{ textAlign: 'center', marginTop: 6, fontStyle: 'italic' }}>
          {resolvedTypeName}
        </div>
      )}

      <div style={{ marginTop: 22 }}>
        <div>Hôm nay, ngày {getPrintableMinuteDate(minute)}</div>
        <div>Tại phòng họp: {minute.location || '........................................................................'}</div>
        <div>Lớp: {minute.class_name || '................................'} Trường: ................................................</div>
        {minute.purpose && <div>{minute.purpose}</div>}
      </div>

      <div style={labelStyle}>I. Thành phần tham dự</div>
      <div>1. Thầy/Cô: ................................................</div>
      <div>2. Chủ trì cuộc họp: {minute.host_name || '................................'} </div>
      <div>3. Thư ký cuộc họp: {minute.secretary_name || '................................'}</div>
      <div>4. Sĩ số học sinh của lớp: {attendance.total}; có mặt {attendance.present}; vắng mặt {attendance.absent}</div>

      <div style={labelStyle}>II. Nội dung</div>
      <TextBlock value={minute.discussion_content} />

      {minute.type_id === 2 && (
        <>
          <div style={labelStyle}>Bảng kết quả bầu ban cán sự</div>
          <ResultTable columns={['Họ và tên', 'Số phiếu bầu', 'Xếp hạng']} />
          <ResultTable columns={['Họ và tên', 'Chức vụ']} />
        </>
      )}

      {minute.conclusion_content && (
        <>
          <div style={labelStyle}>III. Kết luận, ý kiến góp ý</div>
          <TextBlock value={minute.conclusion_content} />
        </>
      )}

      {minute.followup_summary && (
        <>
          <div style={labelStyle}>IV. Theo dõi, kiến nghị</div>
          <TextBlock value={minute.followup_summary} />
        </>
      )}

      <div style={{ marginTop: 18 }}>
        Biên bản kết thúc vào hồi {time.end} cùng ngày.
      </div>
      <div>Biên bản được lập thành ........ bản và có giá trị như nhau.</div>

      <SignatureRow labels={signatureLabels} />
    </div>
  )
}
