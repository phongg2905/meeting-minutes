import { useState } from 'react'
import { Modal, Tooltip, message } from 'antd'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { LockOutlined, GlobalOutlined } from '@ant-design/icons'
import { meetingMinutesService } from '../../services'
import { queryKeys } from '../../utils/queryKeys'

interface MeetingVisibilityToggleProps {
  meetingId: number
  meetingCode: string
  meetingTitle: string
  isPublic: boolean
  canUpdate: boolean
}

export default function MeetingVisibilityToggle({
  meetingId,
  meetingCode,
  meetingTitle,
  isPublic,
  canUpdate,
}: MeetingVisibilityToggleProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (newIsPublic: boolean) =>
      meetingMinutesService.updatePublic(meetingId, newIsPublic),
    onSuccess: (_, newIsPublic) => {
      message.success(
        newIsPublic
          ? 'Đã công khai biên bản thành công.'
          : 'Đã chuyển biên bản về chế độ nội bộ.',
      )
      queryClient.invalidateQueries({ queryKey: queryKeys.meetings.all })
      setConfirmOpen(false)
    },
    onError: (err: any) => {
      message.error(
        err?.response?.data?.message || 'Không thể cập nhật trạng thái công khai. Vui lòng thử lại.',
      )
    },
  })

  const handleConfirm = () => {
    mutation.mutate(!isPublic)
  }

  // ─── Không có quyền: chỉ hiển thị badge tĩnh ───
  if (!canUpdate) {
    return (
      <Tooltip title="Bạn không có quyền thay đổi trạng thái công khai.">
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 12px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 600,
            background: isPublic ? 'var(--color-success-bg)' : 'var(--color-surface-muted)',
            color: isPublic ? 'var(--color-success)' : 'var(--color-text-secondary)',
            whiteSpace: 'nowrap',
            cursor: 'not-allowed',
            opacity: 0.7,
          }}
        >
          {isPublic ? (
            <GlobalOutlined style={{ fontSize: 13 }} />
          ) : (
            <LockOutlined style={{ fontSize: 13 }} />
          )}
          {isPublic ? 'Công khai' : 'Nội bộ'}
        </div>
      </Tooltip>
    )
  }

  const isPending = mutation.isPending

  return (
    <>
      <Tooltip
        title={
          isPublic
            ? 'Biên bản đang được công khai. Nhấn để chuyển về nội bộ.'
            : 'Biên bản hiện chỉ hiển thị nội bộ. Nhấn để công khai.'
        }
      >
        <button
          type="button"
          role="switch"
          aria-checked={isPublic}
          aria-label={isPublic ? 'Chuyển biên bản về nội bộ' : 'Công khai biên bản'}
          disabled={isPending}
          onClick={() => setConfirmOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 12px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 600,
            border: 'none',
            background: isPublic ? 'var(--color-success-bg)' : 'var(--color-surface-muted)',
            color: isPublic ? 'var(--color-success)' : 'var(--color-text-secondary)',
            cursor: isPending ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 150ms ease',
            opacity: isPending ? 0.6 : 1,
            outline: 'none',
          }}
          onMouseEnter={(e) => {
            if (!isPending) {
              e.currentTarget.style.filter = 'brightness(0.95)'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.filter = 'brightness(1)'
          }}
          onFocus={(e) => {
            e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-primary-light)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          {isPublic ? (
            <GlobalOutlined style={{ fontSize: 13 }} />
          ) : (
            <LockOutlined style={{ fontSize: 13 }} />
          )}

          {isPublic ? 'Công khai' : 'Nội bộ'}

          <span
            aria-hidden="true"
            style={{
              position: 'relative',
              display: 'inline-block',
              width: 22,
              height: 13,
              borderRadius: 10,
              background: isPublic ? 'var(--color-success)' : 'var(--color-border)',
              transition: 'background 200ms ease',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: 2,
                left: isPublic ? 10 : 2,
                width: 9,
                height: 9,
                borderRadius: '50%',
                background: '#fff',
                transition: 'left 200ms ease',
                boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
              }}
            />
          </span>
        </button>
      </Tooltip>

      {/* ─── Confirmation Dialog ─── */}
      <Modal
        open={confirmOpen}
        onCancel={() => {
          if (!isPending) setConfirmOpen(false)
        }}
        footer={null}
        closable={!isPending}
        maskClosable={!isPending}
        width={440}
        style={{ borderRadius: 24 }}
        styles={{
          content: {
            borderRadius: 24,
            padding: 28,
            background: 'var(--color-surface-raised)',
          },
          header: {
            borderRadius: '24px 24px 0 0',
            marginBottom: 16,
          },
        }}
      >
        <div style={{ textAlign: 'center' }}>
          {/* Icon */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: 28,
              background: isPublic
                ? 'var(--color-warning-bg)'
                : 'var(--color-primary-light)',
              color: isPublic
                ? 'var(--color-warning)'
                : 'var(--color-primary)',
            }}
          >
            {isPublic ? <LockOutlined /> : <GlobalOutlined />}
          </div>

          {/* Title */}
          <h3
            style={{
              margin: '0 0 8px',
              fontSize: 17,
              fontWeight: 700,
              color: 'var(--color-text)',
            }}
          >
            {isPublic ? 'Chuyển biên bản về nội bộ?' : 'Công khai biên bản họp?'}
          </h3>

          {/* Description */}
          <p
            style={{
              margin: '0 0 6px',
              fontSize: 13,
              color: 'var(--color-text-secondary)',
              lineHeight: 1.6,
            }}
          >
            {isPublic ? (
              <>
                Sau khi chuyển về nội bộ, đường dẫn công khai của biên bản{' '}
                <strong style={{ color: 'var(--color-text)' }}>“{meetingTitle}”</strong>{' '}
                sẽ không còn truy cập được.
              </>
            ) : (
              <>
                Sau khi công khai, bất kỳ ai có đường dẫn đều có thể xem biên bản{' '}
                <strong style={{ color: 'var(--color-text)' }}>“{meetingTitle}”</strong>{' '}
                mà không cần đăng nhập.
              </>
            )}
          </p>
          <p
            style={{
              margin: '0 0 24px',
              fontSize: 13,
              color: 'var(--color-text-tertiary)',
              lineHeight: 1.6,
            }}
          >
            Mã biên bản: <strong style={{ color: 'var(--color-text)' }}>{meetingCode}</strong>
          </p>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setConfirmOpen(false)}
              style={{
                padding: '8px 24px',
                borderRadius: 12,
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                fontSize: 14,
                fontWeight: 600,
                cursor: isPending ? 'not-allowed' : 'pointer',
                opacity: isPending ? 0.5 : 1,
                transition: 'all 150ms ease',
              }}
            >
              Hủy
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={handleConfirm}
              style={{
                padding: '8px 24px',
                borderRadius: 12,
                border: 'none',
                background: isPublic
                  ? 'var(--color-warning)'
                  : 'var(--color-primary)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                cursor: isPending ? 'not-allowed' : 'pointer',
                opacity: isPending ? 0.6 : 1,
                transition: 'all 150ms ease',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {isPending ? (
                <>
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff',
                      animation: 'spin 0.6s linear infinite',
                    }}
                  />
                  {isPublic ? 'Đang cập nhật...' : 'Đang công khai...'}
                </>
              ) : (
                <>
                  {isPublic ? <LockOutlined /> : <GlobalOutlined />}
                  {isPublic ? 'Chuyển về nội bộ' : 'Xác nhận công khai'}
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
}
