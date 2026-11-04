import { MdCall, MdCheck, MdEdit, MdEmail, MdEvent, MdMessage, MdMoreHoriz } from "react-icons/md";
import { formatFollowUpDate, isFollowUpOverdue } from "../../utils/followUpTime";

const typeIcons = { Call: MdCall, WhatsApp: MdMessage, Email: MdEmail, Meeting: MdEvent, Other: MdMoreHoriz };

const FollowUpCard = ({ item, onComplete, onEdit, onCancel, busy = false, timeZone = "Asia/Kolkata" }) => {
  const Icon = typeIcons[item.type] || MdMoreHoriz;
  const isPending = item.status === "Pending";
  const overdue = isFollowUpOverdue(item, timeZone);
  return (
    <article className={`follow-up-card ${item.status !== "Pending" ? "follow-up-card-muted" : ""}`}>
      <div className="follow-up-card-date"><strong>{formatFollowUpDate(item.scheduledDate)}</strong><span>{item.scheduledTime}</span></div>
      <div className="follow-up-card-icon"><Icon size={19} /></div>
      <div className="follow-up-card-body"><div className="follow-up-card-top"><div><h3>{item.leadId?.name || "Unknown lead"}</h3><p>{item.leadId?.company || ""}</p></div><div className="flex flex-wrap items-center gap-1.5"><span className={`follow-up-status follow-up-status-${item.status.toLowerCase()}`}>{item.status}</span>{overdue && <span className="follow-up-overdue" aria-label="Overdue follow-up">Overdue</span>}</div></div><p className="follow-up-type"><Icon size={15} /> {item.type}</p>{item.note && <p className="follow-up-note">{item.note}</p>}</div>
      {isPending && <div className="follow-up-card-actions" aria-busy={busy}><button type="button" onClick={() => onComplete(item)} className="follow-up-complete" disabled={busy}><MdCheck size={16} /> {busy ? "Saving..." : "Complete"}</button><button type="button" onClick={() => onEdit(item)} className="follow-up-edit" disabled={busy}><MdEdit size={15} /> Edit</button><button type="button" onClick={() => onCancel(item)} className="follow-up-cancel" disabled={busy}>Cancel</button></div>}
    </article>
  );
};

export default FollowUpCard;
