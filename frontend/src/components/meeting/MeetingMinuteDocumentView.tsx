import MinuteDocumentPreview from './MinuteDocumentPreview'

type Props = {
  minute: any
  typeName?: string
  printable?: boolean
}

export default function MeetingMinuteDocumentView({ minute, typeName, printable = false }: Props) {
  return (
    <div
      data-print-ready="true"
      style={{
        maxWidth: printable ? 860 : '100%',
        margin: printable ? '0 auto' : undefined,
        padding: printable ? '12px 0 0' : 0,
      }}
    >
      <MinuteDocumentPreview minute={minute} typeName={typeName} />
    </div>
  )
}
