import { Button } from "@/components/ui/button"
import { FileText, LogOut, Plus } from "lucide-react"
import {Link, useLocation, useNavigate} from "react-router";

export function DashboardNav() {
    const navigate = useNavigate()
    const location = useLocation();

    const handleLogout = () => {
        navigate("/login")
    }

    const navItems = [
        {
            label: "Documents",
            href: "/dashboard",
            icon: FileText,
        },
    ]

    return (
        <nav className="w-64 border-r border-border bg-sidebar text-sidebar-foreground flex flex-col">
            <div className="p-6 border-b border-sidebar-border">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
                        <FileText className="h-5 w-5 text-sidebar-primary-foreground" />
                    </div>
                    <div>
                        <h2 className="font-bold text-lg">SignDocs</h2>
                        <p className="text-xs text-sidebar-foreground/60">PDF Manager</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 p-4 space-y-2">
                {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = location.pathname === item.href
                    return (
                        <Link key={item.href} to={item.href}>
                            <Button variant={isActive ? "secondary" : "ghost"} className="w-full justify-start">
                                <Icon className="mr-2 h-4 w-4" />
                                {item.label}
                            </Button>
                        </Link>
                    )
                })}
            </div>

            <div className="p-4 border-t border-sidebar-border space-y-2">
                <Link to="/dashboard/documents/create" className="block">
                    <Button className="w-full justify-start bg-sidebar-primary hover:bg-sidebar-primary/90">
                        <Plus className="mr-2 h-4 w-4" />
                        New Document
                    </Button>
                </Link>
                <Button
                    variant="ghost"
                    className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={handleLogout}
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                </Button>
            </div>
        </nav>
    )
}
