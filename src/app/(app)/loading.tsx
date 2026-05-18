// Minimal loading state — shown while server components fetch data on navigation
export default function Loading() {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      minHeight: 300,
    }}>
      <div style={{
        width: 20,
        height: 20,
        borderRadius: '50%',
        border: '2px solid var(--border-md)',
        borderTopColor: 'var(--text)',
        animation: 'spin 0.7s linear infinite',
      }} />
    </div>
  );
}
