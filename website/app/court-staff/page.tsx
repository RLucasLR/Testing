"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CaseDetailModal } from "@/components/case-detail-modal"
import { Search, Eye, Filter, RefreshCw, FileText, Calendar, User } from "lucide-react"

interface ArrestRecord {
  id: string
  arrestedUser: string
  reasonForArrest: string
  arrestContext: string // Add this line
  evidence: string
  courtDatesAvailability: string
  officerId: string
  status: string
  submissionDate: string
  courtStaffNotes: string
}

export default function CourtStaffDashboard() {
  const [records, setRecords] = useState<ArrestRecord[]>([])
  const [filteredRecords, setFilteredRecords] = useState<ArrestRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("All")
  const [caseIdSearch, setCaseIdSearch] = useState("")
  const [nameSearch, setNameSearch] = useState("")
  const [selectedCase, setSelectedCase] = useState<ArrestRecord | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    fetchRecords()
  }, [])

  useEffect(() => {
    filterRecords()
  }, [records, statusFilter, caseIdSearch, nameSearch])

  const fetchRecords = () => {
    setLoading(true)
    try {
      // Get records from localStorage
      const storedRecords = JSON.parse(localStorage.getItem("arrestRecords") || "[]")

      // Add some demo records if none exist
      if (storedRecords.length === 0) {
        const demoRecords: ArrestRecord[] = [
          {
            id: "case-2024-001",
            arrestedUser: "John Doe",
            reasonForArrest: "Theft - 2.1-01 [CLASS 4 FELONY], Vandalism - 7.1-01 [CLASS 1 MISDEMEANOR]",
            arrestContext:
              "On January 15, 2024, at approximately 2:30 PM, I responded to a theft report at Main Street Store (123 Main St). Store manager reported observing suspect concealing merchandise and attempting to leave without payment. Upon arrival, I reviewed security footage showing suspect placing items in jacket and bypassing checkout. Suspect was apprehended in parking lot with stolen merchandise valued at $450. During arrest, suspect also admitted to spray-painting graffiti on store's exterior wall earlier that morning.",
            evidence:
              "Security camera footage from Main Street Store, witness statements from store clerk and customer, recovered stolen merchandise valued at $450",
            courtDatesAvailability: "2024-02-15",
            officerId: "officer-badge-1234",
            status: "Pending Review",
            submissionDate: new Date().toISOString(),
            courtStaffNotes: "",
          },
          {
            id: "case-2024-002",
            arrestedUser: "Jane Smith",
            reasonForArrest: "DUI - 4.1-01 [CLASS 1 MISDEMEANOR]",
            arrestContext:
              "On January 14, 2024, at approximately 11:45 PM, I conducted a traffic stop on Highway 83 after observing vehicle swerving between lanes and failing to maintain consistent speed. Driver exhibited signs of impairment including slurred speech, bloodshot eyes, and strong odor of alcohol. Field sobriety tests were administered with poor performance on all three standardized tests. Breathalyzer test administered at 12:15 AM showed BAC of 0.12, exceeding legal limit.",
            evidence: "Breathalyzer results showing 0.12 BAC, field sobriety test video, officer body cam footage",
            courtDatesAvailability: "2024-02-20",
            officerId: "officer-badge-5678",
            status: "Accepted",
            submissionDate: new Date(Date.now() - 86400000).toISOString(),
            courtStaffNotes: "Case reviewed and approved for prosecution. All evidence properly documented.",
          },
          {
            id: "case-2024-003",
            arrestedUser: "Bob Johnson",
            reasonForArrest: "Assault - 1.3-01 [CLASS 3 MISDEMEANOR]",
            arrestContext:
              "On January 13, 2024, at approximately 8:20 PM, I responded to a disturbance call at Murphy's Bar (456 Oak Street). Upon arrival, witnesses reported that suspect had struck another patron during an argument over a pool game. Victim sustained visible injuries to face and was treated by paramedics. Multiple witnesses provided consistent statements about the incident. Suspect was cooperative during arrest but showed signs of intoxication.",
            evidence: "Medical reports from victim, witness testimony from 3 bystanders, photos of injuries",
            courtDatesAvailability: "2024-02-25",
            officerId: "officer-badge-9012",
            status: "Denied",
            submissionDate: new Date(Date.now() - 172800000).toISOString(),
            courtStaffNotes: "Insufficient evidence to proceed. Witness statements are contradictory.",
          },
          {
            id: "case-2024-004",
            arrestedUser: "Alice Williams",
            reasonForArrest: "Drug Possession - 3.1-01 [CLASS 1 MISDEMEANOR]",
            arrestContext:
              "On January 12, 2024, at approximately 4:15 PM, I conducted a routine traffic stop for speeding on Elm Street. During the stop, I observed suspicious behavior and detected strong odor of marijuana from vehicle. With probable cause, I conducted a search and discovered 2.3 grams of marijuana in center console. Suspect admitted to possession and was cooperative throughout the process. Valid search warrant was obtained prior to vehicle search.",
            evidence: "Recovered substance tested positive for marijuana (2.3g), search warrant documentation",
            courtDatesAvailability: "2024-03-01",
            officerId: "officer-badge-3456",
            status: "Pending Review",
            submissionDate: new Date(Date.now() - 43200000).toISOString(),
            courtStaffNotes: "",
          },
          {
            id: "case-2024-005",
            arrestedUser: "Michael Brown",
            reasonForArrest: "Burglary - 2.2-01 [CLASS 3 FELONY], Theft - 2.1-01 [CLASS 4 FELONY]",
            arrestContext:
              "On January 11, 2024, at approximately 3:00 AM, I responded to a silent alarm at Johnson Electronics (789 Pine Street). Upon arrival, I observed broken window at rear of building and suspect exiting through same window carrying electronic equipment. Suspect attempted to flee but was apprehended after brief foot pursuit. Search of suspect's vehicle revealed additional stolen merchandise from the store. Fingerprints on broken glass matched suspect's prints on file.",
            evidence:
              "Fingerprints on broken window, stolen items found in suspect's vehicle, neighbor security footage",
            courtDatesAvailability: "2024-03-05",
            officerId: "officer-badge-7890",
            status: "Accepted",
            submissionDate: new Date(Date.now() - 259200000).toISOString(),
            courtStaffNotes: "Strong evidence case. Recommend proceeding with full charges.",
          },
        ]
        localStorage.setItem("arrestRecords", JSON.stringify(demoRecords))
        setRecords(demoRecords)
      } else {
        setRecords(storedRecords)
      }
    } catch (error) {
      console.error("Failed to fetch records:", error)
      setRecords([])
    } finally {
      setTimeout(() => setLoading(false), 500) // Add slight delay for better UX
    }
  }

  const filterRecords = () => {
    let filtered = records

    // Status filter
    if (statusFilter !== "All") {
      filtered = filtered.filter((record) => record.status === statusFilter)
    }

    // Case ID search
    if (caseIdSearch) {
      filtered = filtered.filter((record) => record.id.toLowerCase().includes(caseIdSearch.toLowerCase()))
    }

    // Name search
    if (nameSearch) {
      filtered = filtered.filter((record) => record.arrestedUser.toLowerCase().includes(nameSearch.toLowerCase()))
    }

    setFilteredRecords(filtered)
  }

  const handleCaseIdSearch = (value: string) => {
    setCaseIdSearch(value)
    if (value) setNameSearch("") // Clear name search when case ID is entered
  }

  const handleNameSearch = (value: string) => {
    setNameSearch(value)
    if (value) setCaseIdSearch("") // Clear case ID search when name is entered
  }

  const openCaseModal = (record: ArrestRecord) => {
    setSelectedCase(record)
    setModalOpen(true)
  }

  const updateCaseStatus = (caseId: string, status: string, notes: string) => {
    try {
      // Update in localStorage
      const storedRecords = JSON.parse(localStorage.getItem("arrestRecords") || "[]")
      const updatedRecords = storedRecords.map((record: ArrestRecord) =>
        record.id === caseId ? { ...record, status, courtStaffNotes: notes } : record,
      )
      localStorage.setItem("arrestRecords", JSON.stringify(updatedRecords))

      // Update local state
      setRecords(updatedRecords)
      setModalOpen(false)
    } catch (error) {
      console.error("Failed to update case:", error)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      "Pending Review": "bg-yellow-100 text-yellow-800 border-yellow-200",
      Accepted: "bg-green-100 text-green-800 border-green-200",
      Denied: "bg-red-100 text-red-800 border-red-200",
    }

    return (
      <Badge
        className={`${variants[status as keyof typeof variants] || "bg-gray-100 text-gray-800 border-gray-200"} border font-medium`}
      >
        {status}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return "N/A"
    }
  }

  const getStatusCounts = () => {
    return {
      total: records.length,
      pending: records.filter((r) => r.status === "Pending Review").length,
      accepted: records.filter((r) => r.status === "Accepted").length,
      denied: records.filter((r) => r.status === "Denied").length,
    }
  }

  const statusCounts = getStatusCounts()

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <Card className="shadow-xl border-0">
          <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-lg">
            <CardTitle className="text-2xl font-bold">Court Staff Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-center justify-center min-h-96">
              <div className="flex items-center space-x-3">
                <RefreshCw className="h-6 w-6 animate-spin text-indigo-600" />
                <div className="text-lg text-gray-600">Loading arrest records...</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Cases</p>
                <p className="text-2xl font-bold text-gray-900">{statusCounts.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Calendar className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-yellow-600">{statusCounts.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <User className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Accepted</p>
                <p className="text-2xl font-bold text-green-600">{statusCounts.accepted}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Filter className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Denied</p>
                <p className="text-2xl font-bold text-red-600">{statusCounts.denied}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard */}
      <Card className="shadow-xl border-0">
        <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">Case Management Dashboard</CardTitle>
            <Button
              onClick={fetchRecords}
              variant="secondary"
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Filters and Search */}
          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Filter by Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filter by Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Cases ({statusCounts.total})</SelectItem>
                    <SelectItem value="Pending Review">Pending Review ({statusCounts.pending})</SelectItem>
                    <SelectItem value="Accepted">Accepted ({statusCounts.accepted})</SelectItem>
                    <SelectItem value="Denied">Denied ({statusCounts.denied})</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Search by Case ID</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Enter case ID..."
                    value={caseIdSearch}
                    onChange={(e) => handleCaseIdSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Search by Name</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Enter arrested person's name..."
                    value={nameSearch}
                    onChange={(e) => handleNameSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
              <span>
                Showing <span className="font-medium">{filteredRecords.length}</span> of{" "}
                <span className="font-medium">{records.length}</span> cases
              </span>
              {(caseIdSearch || nameSearch || statusFilter !== "All") && (
                <Button
                  onClick={() => {
                    setCaseIdSearch("")
                    setNameSearch("")
                    setStatusFilter("All")
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Clear filters
                </Button>
              )}
            </div>
          </div>

          {/* Records Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-4 font-semibold text-gray-700">Case ID</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Arrested Person</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Primary Charge</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Status</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Submitted</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Officer</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRecords.map((record, index) => (
                    <tr
                      key={record.id}
                      className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-gray-25"}`}
                    >
                      <td className="p-4">
                        <div className="font-mono text-sm font-medium text-indigo-600">{record.id}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-gray-900">{record.arrestedUser}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm text-gray-600 max-w-xs truncate">
                          {record.reasonForArrest.split(",")[0] || "N/A"}
                        </div>
                      </td>
                      <td className="p-4">{getStatusBadge(record.status)}</td>
                      <td className="p-4">
                        <div className="text-sm text-gray-600">{formatDate(record.submissionDate)}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-mono text-xs text-gray-500">{record.officerId}</div>
                      </td>
                      <td className="p-4">
                        <Button
                          onClick={() => openCaseModal(record)}
                          size="sm"
                          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Review
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredRecords.length === 0 && (
              <div className="text-center py-16">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No cases found</h3>
                <p className="text-gray-500 mb-4">
                  {records.length === 0
                    ? "No arrest records have been submitted yet."
                    : "No cases match your current search criteria."}
                </p>
                {(caseIdSearch || nameSearch || statusFilter !== "All") && (
                  <Button
                    onClick={() => {
                      setCaseIdSearch("")
                      setNameSearch("")
                      setStatusFilter("All")
                    }}
                    variant="outline"
                  >
                    Clear all filters
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Case Detail Modal */}
      {selectedCase && (
        <CaseDetailModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          case={selectedCase}
          onUpdateCase={updateCaseStatus}
        />
      )}
    </div>
  )
}
