import * as React from "react"

const HoverButton = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={className}
      {...props}
    >
      {children}
    </button>
  )
})

HoverButton.displayName = "HoverButton"

export { HoverButton }
