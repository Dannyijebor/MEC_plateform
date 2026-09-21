import { useState } from "react"
import { ChevronDown, BookOpen } from "lucide-react"

export default function AyoRules({ defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-[#D97706]/30 bg-[#FFFBEB]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[#FEF3C7]"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FCD34D] text-[#78350F]">
          <BookOpen size={16} />
        </div>
        <span className="flex-1 text-sm font-bold text-[#78350F]">
          How to play Ayo
        </span>
        <ChevronDown
          size={16}
          className={"shrink-0 text-[#78350F] transition " + (open ? "rotate-180" : "")}
        />
      </button>

      {open && (
        <div className="space-y-3 border-t border-[#D97706]/20 px-4 py-4 text-[13px] leading-6 text-[#78350F]">

          <p className="font-semibold">
            Ayo (Oware) is a sowing game for two players. 48 seeds, 12 pits, 4 seeds per pit.
          </p>

          <div>
            <p className="font-bold">🎯 Goal</p>
            <p>Capture 25 seeds — more than half of all 48 — to win.</p>
          </div>

          <div>
            <p className="font-bold">🖐 Your turn</p>
            <p>
              You own the <strong>bottom row</strong>. Pick any pit with seeds.
              All seeds from that pit are picked up and sown{" "}
              <strong>one at a time</strong> into the following pits going
              counter-clockwise (bottom row left to right, then top row left to right).
            </p>
          </div>

          <div>
            <p className="font-bold">🌰 Sowing</p>
            <p>
              If you have 12 or more seeds, you skip the pit you started from —
              that one stays empty until the round is over.
            </p>
          </div>

          <div>
            <p className="font-bold">✋ Capture</p>
            <p>
              If your <strong>last seed</strong> lands in an opponent's pit that
              now has <strong>2 or 3 seeds</strong>, you capture those seeds. Then
              check the pit the seed just came from: if it's also the opponent's
              and also has 2 or 3 seeds, capture it too. Keep walking backward
              until the chain breaks.
            </p>
          </div>

          <div>
            <p className="font-bold">🛡 Don't starve the opponent</p>
            <p>
              You can't make a move that leaves your opponent with <strong>zero seeds</strong>{" "}
              on their row. If that would happen, the capture is cancelled — the
              seeds stay on the board.
            </p>
          </div>

          <div>
            <p className="font-bold">🏁 End of game</p>
            <ul className="ml-4 list-disc space-y-0.5">
              <li>First player to reach 25 captures wins immediately.</li>
              <li>
                If your opponent can't move on their turn, you capture everything
                left on your own row. Highest total wins.
              </li>
              <li>If both finish at 24, it's a draw.</li>
            </ul>
          </div>

          <p className="rounded-lg bg-white/60 px-3 py-2 text-xs italic">
            Tip: landing on a pit with 2 or 3 seeds is the only way to capture.
            Watch the pits near your opponent's row carefully.
          </p>
        </div>
      )}
    </div>
  )
}
