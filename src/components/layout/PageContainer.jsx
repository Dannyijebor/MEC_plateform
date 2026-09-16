function PageContainer({ children, className = "" }) {
  return (
    <main
      className={`relative z-10 min-h-[calc(100vh-4rem)] px-4 pb-24 pt-5 sm:px-6 sm:pb-24 lg:ml-64 lg:px-8 lg:pb-8 ${className}`}
    >
      <div className="mx-auto w-full max-w-7xl">
        {children}
      </div>
    </main>
  )
}

export default PageContainer
