
const Button = ({ text, className, disabled = false, type = "submit" }) => {
  return (
    <button type={type} disabled={disabled} className={`px-3 py-1 rounded ${className}`}>
        {text}
    </button>
  )
}

export default Button;