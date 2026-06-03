

const Button = ({ text, className }) => {
  return (
    <button className={`px-3 py-1 rounded ${className}`}>
        {text}
    </button>
  )
}

export default Button;