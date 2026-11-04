import { useEffect, useRef, useState } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { parsePhoneNumberFromString } from "libphonenumber-js";

const getInternationalNumber = (value) => {
  if (!String(value || "").trim().startsWith("+")) return null;
  const parsed = parsePhoneNumberFromString(value);
  return parsed?.isValid() ? parsed.number : null;
};

const PhoneWhatsAppAction = ({ name, phone, onSavePhone, compact = false }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [correctedPhone, setCorrectedPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [readyPhone, setReadyPhone] = useState("");
  const dialogRef = useRef(null);
  const internationalNumber = getInternationalNumber(readyPhone || phone);
  const buttonClass = compact
    ? "grid h-8 w-8 place-items-center rounded-lg text-green-700 hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
    : "inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-green-200 bg-white px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400";
  const startCorrection = () => {
    setCorrectedPhone("");
    setError("");
    setDialogOpen(true);
  };

  useEffect(() => {
    if (!dialogOpen) return undefined;
    const previousFocus = document.activeElement;
    dialogRef.current?.querySelector("input")?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setDialogOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusableElements = dialogRef.current?.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusableElements?.length) return;
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [dialogOpen]);

  const saveCorrection = async (event) => {
    event.preventDefault();
    const parsed = parsePhoneNumberFromString(correctedPhone);
    if (!correctedPhone.trim().startsWith("+") || !parsed?.isValid()) {
      setError("Enter a valid international number with its country calling code, such as +14155552671.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onSavePhone(parsed.number);
      setReadyPhone(parsed.number);
      setDialogOpen(false);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || "Unable to update this phone number.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {internationalNumber ? (
        <a
          className={buttonClass}
          href={`https://wa.me/${internationalNumber.slice(1)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`WhatsApp ${name}`}
          title="WhatsApp"
        >
          <FaWhatsapp />{compact ? null : "WhatsApp"}
        </a>
      ) : (
        <button type="button" className={buttonClass} onClick={startCorrection} aria-label={`Confirm country code for ${name}`} title="Confirm international phone number">
          <FaWhatsapp />{compact ? null : "Add country code"}
        </button>
      )}
      {readyPhone && <span className="text-xs font-medium text-emerald-700" role="status">Phone updated</span>}
      {dialogOpen && (
        <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-slate-950/45 p-4" role="presentation" onMouseDown={() => setDialogOpen(false)}>
          <section ref={dialogRef} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="whatsapp-number-title" onMouseDown={(event) => event.stopPropagation()}>
            <h2 id="whatsapp-number-title" className="text-lg font-bold text-slate-900">Confirm international number</h2>
            <p className="mt-2 text-sm text-slate-600">The saved number <strong>{phone || "is blank"}</strong> does not include a verified international country code. Enter the complete number with + and its country calling code. The current value will stay unchanged until you save this correction.</p>
            <form className="mt-4 space-y-3" onSubmit={saveCorrection}>
              <label htmlFor="whatsapp-international-number" className="block text-sm font-semibold text-slate-700">International phone number
                <input
                  autoFocus
                  id="whatsapp-international-number"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={correctedPhone}
                  onChange={(event) => setCorrectedPhone(event.target.value)}
                  placeholder="+14155552671"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-green-400 focus:ring-4 focus:ring-green-100"
                  aria-describedby="whatsapp-number-help"
                  required
                />
              </label>
              <p id="whatsapp-number-help" className="text-xs text-slate-500">The country will be validated from the number you provide; no country is inferred from the existing value.</p>
              {error && <p className="text-sm text-rose-700" role="alert">{error}</p>}
              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setDialogOpen(false)} className="min-h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600">Cancel</button>
                <button type="submit" disabled={saving} className="min-h-10 rounded-xl bg-green-700 px-4 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving..." : "Save corrected number"}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
};

export default PhoneWhatsAppAction;
