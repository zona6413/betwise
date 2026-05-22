import { Globe, Send, MessageCircle, BarChart2, Shield, X } from 'lucide-react'

const links = [
  { title: 'Comment ça marche', href: '#' },
  { title: 'Value bets',        href: '#' },
  { title: 'Tarifs',            href: '#' },
  { title: 'Aide',              href: '#' },
  { title: 'Mentions légales',  href: '#', legal: 'mentions' },
  { title: 'CGU',               href: '#', legal: 'cgu' },
  { title: 'Confidentialité',   href: '#', legal: 'confidentialite' },
  { title: 'Jeu responsable',   href: '#', legal: 'jeu' },
]

const socials = [
  { icon: X,             label: 'Twitter / X' },
  { icon: MessageCircle, label: 'Discord' },
  { icon: Send,          label: 'Telegram' },
  { icon: Globe,         label: 'Site web' },
]

export default function FooterSection({ onOpenLegal }) {
  return (
    <footer className="py-16 md:py-24 border-t border-white/5">
      <div className="mx-auto max-w-4xl px-6">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-green-700 flex items-center justify-center">
              <BarChart2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-semibold text-base tracking-tight">BetWise</span>
          </div>
        </div>

        {/* Nav links */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm mb-8">
          {links.map((link, i) => (
            <button
              key={i}
              onClick={() => link.legal ? onOpenLegal?.(link.legal) : null}
              className="text-white/30 hover:text-white/70 transition-colors duration-150 cursor-pointer bg-transparent border-none p-0"
            >
              {link.title}
            </button>
          ))}
        </div>

        {/* Socials */}
        <div className="flex justify-center gap-5 mb-10">
          {socials.map(({ icon: Icon, label }, i) => (
            <a
              key={i}
              href="#"
              aria-label={label}
              className="text-white/25 hover:text-white/60 transition-colors duration-150"
            >
              <Icon className="w-5 h-5" />
            </a>
          ))}
        </div>

        {/* Jeu responsable */}
        <div className="flex items-center justify-center gap-2 mb-6 text-xs text-white/20">
          <Shield className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Pariez de manière responsable. 18+ uniquement. Le jeu peut créer une dépendance.</span>
        </div>

        {/* Copyright */}
        <p className="text-center text-xs text-white/15">
          © {new Date().getFullYear()} BetWise — Tous droits réservés
        </p>
      </div>
    </footer>
  )
}
