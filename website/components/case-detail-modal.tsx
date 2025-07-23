"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, Check, X, Calendar, User, FileText, Shield, Clock, AlertCircle, Save, Copy } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface CaseDetailModalProps {
  isOpen: boolean
  onClose: () => void
  case: {
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
  onUpdateCase: (caseId: string, status: string, notes: string) => void
}

export function CaseDetailModal({ isOpen, onClose, case: caseData, onUpdateCase }: CaseDetailModalProps) {
  const [notes, setNotes] = useState(caseData.courtStaffNotes || "")
  const [aiSummary, setAiSummary] = useState("")
  const [loadingAI, setLoadingAI] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [notesSaved, setNotesSaved] = useState(true)
  const [showConfirmation, setShowConfirmation] = useState<string | null>(null)

  // Reset state when modal opens with new case
  useEffect(() => {
    if (isOpen) {
      setNotes(caseData.courtStaffNotes || "")
      setAiSummary("")
      setNotesSaved(true)
      setShowConfirmation(null)
    }
  }, [isOpen, caseData.id])

  // Track notes changes
  useEffect(() => {
    setNotesSaved(notes === caseData.courtStaffNotes)
  }, [notes, caseData.courtStaffNotes])

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    } catch {
      return "N/A"
    }
  }

  const generateAISummary = async () => {
    setLoadingAI(true)
    try {
      const response = await fetch("/api/generate-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseData: {
            caseId: caseData.id,
            arrestedUser: caseData.arrestedUser,
            reasonForArrest: caseData.reasonForArrest,
            arrestContext: caseData.arrestContext, // Add this line
            evidence: caseData.evidence,
            courtDatesAvailability: caseData.courtDatesAvailability,
            officerId: caseData.officerId,
            submissionDate: formatDate(caseData.submissionDate),
          },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setAiSummary(data.summary)
      } else {
        setAiSummary("Failed to generate AI summary. Please try again.")
      }
    } catch (error) {
      console.error("AI summary generation failed:", error)
      setAiSummary("Error generating AI summary. Please check your connection and try again.")
    } finally {
      setLoadingAI(false)
    }
  }

  const saveNotes = async () => {
    setUpdating(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 500)) // Simulate network delay
      onUpdateCase(caseData.id, caseData.status, notes)
      setNotesSaved(true)
    } finally {
      setUpdating(false)
    }
  }

  const handleStatusUpdate = async (newStatus: string) => {
    if (showConfirmation === newStatus) {
      setUpdating(true)
      try {
        await new Promise((resolve) => setTimeout(resolve, 800)) // Simulate network delay
        onUpdateCase(caseData.id, newStatus, notes)
        setShowConfirmation(null)
      } finally {
        setUpdating(false)
      }
    } else {
      setShowConfirmation(newStatus)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      "Pending Review": "bg-yellow-100 text-yellow-800 border-yellow-300",
      Accepted: "bg-green-100 text-green-800 border-green-300",
      Denied: "bg-red-100 text-red-800 border-red-300",
    }

    const icons = {
      "Pending Review": <Clock className="h-3 w-3 mr-1" />,
      Accepted: <Check className="h-3 w-3 mr-1" />,
      Denied: <X className="h-3 w-3 mr-1" />,
    }

    return (
      <Badge
        className={`${variants[status as keyof typeof variants] || "bg-gray-100 text-gray-800 border-gray-300"} border font-medium flex items-center`}
      >
        {icons[status as keyof typeof icons]}
        {status}
      </Badge>
    )
  }

  const parseCharges = (reasonForArrest: string) => {
    return reasonForArrest
      .split(",")
      .map((charge) => charge.trim())
      .filter(Boolean)
  }

  const getChargeSeverity = (charge: string) => {
    if (charge.includes("FELONY")) {
      return charge.includes("CLASS 1") || charge.includes("CLASS 2") ? "high" : "medium"
    }
    return "low"
  }

  const charges = parseCharges(caseData.reasonForArrest)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[95vh] overflow-hidden flex flex-col bg-white">
        <DialogHeader className="flex-shrink-0 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="h-6 w-6 text-indigo-600" />
                Case Review - {caseData.id}
              </DialogTitle>
              <p className="text-sm text-gray-500 mt-1">Submitted {formatDate(caseData.submissionDate)}</p>
            </div>
            {getStatusBadge(caseData.status)}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-4 bg-white max-h-[calc(95vh-200px)]">
          <div className="space-y-6 bg-white pb-4">
            {/* Case Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-600" />
                    Case Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-600">Case ID</Label>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm bg-gray-50 p-2 rounded border">{caseData.id}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(caseData.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-600">Officer Badge</Label>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-blue-600" />
                        <p className="font-mono text-sm">{caseData.officerId}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-600">Arrested Individual</Label>
                      <p className="font-medium text-lg">{caseData.arrestedUser}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-600">Court Date Availability</Label>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-green-600" />
                        <p>{caseData.courtDatesAvailability || "Not specified"}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Case Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">{getStatusBadge(caseData.status)}</div>
                  <div className="text-sm text-gray-600 space-y-2">
                    <div className="flex justify-between">
                      <span>Submitted:</span>
                      <span className="font-medium">{formatDate(caseData.submissionDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Charges:</span>
                      <span className="font-medium">{charges.length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charges Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  Charges Filed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {charges.map((charge, index) => {
                    const severity = getChargeSeverity(charge)
                    const severityColors = {
                      high: "border-red-200 bg-red-50",
                      medium: "border-orange-200 bg-orange-50",
                      low: "border-blue-200 bg-blue-50",
                    }

                    return (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border ${severityColors[severity]} transition-colors`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{charge}</span>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              severity === "high"
                                ? "border-red-300 text-red-700"
                                : severity === "medium"
                                  ? "border-orange-300 text-orange-700"
                                  : "border-blue-300 text-blue-700"
                            }`}
                          >
                            {severity.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Arrest Context Section - Add this after the Charges section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-indigo-600" />
                  Arrest Context & Circumstances
                </CardTitle>
              </CardHeader>
              <CardContent>
                {caseData.arrestContext ? (
                  <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-indigo-900">
                      {caseData.arrestContext}
                    </p>
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>No arrest context information provided.</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Evidence Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-600" />
                  Evidence Documentation
                </CardTitle>
              </CardHeader>
              <CardContent>
                {caseData.evidence ? (
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{caseData.evidence}</p>
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>No evidence documentation provided.</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Court Staff Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-indigo-600" />
                    Court Staff Notes
                  </span>
                  {!notesSaved && (
                    <Button
                      onClick={saveNotes}
                      disabled={updating}
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Save className="h-4 w-4 mr-1" />
                      {updating ? "Saving..." : "Save Notes"}
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add your review notes, recommendations, or concerns about this case..."
                  rows={6}
                  className="w-full resize-none"
                />
                {!notesSaved && (
                  <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    You have unsaved changes
                  </p>
                )}
              </CardContent>
            </Card>

            {/* AI Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    AI Case Analysis
                  </span>
                  <Button
                    onClick={generateAISummary}
                    disabled={loadingAI}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Sparkles className="h-4 w-4 mr-1" />
                    {loadingAI ? "Analyzing..." : "Generate Analysis"}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {aiSummary ? (
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-purple-800">AI Generated Analysis</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(aiSummary)}
                        className="h-6 w-6 p-0 text-purple-600"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-purple-900">{aiSummary}</p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Sparkles className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">Click "Generate Analysis" to get an AI-powered case review</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 pt-6 border-t">
          {showConfirmation && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Are you sure you want to {showConfirmation.toLowerCase()} this case? This action cannot be undone.
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    onClick={() => handleStatusUpdate(showConfirmation)}
                    disabled={updating}
                    className={
                      showConfirmation === "Accepted"
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-red-600 hover:bg-red-700"
                    }
                  >
                    {updating ? "Processing..." : `Yes, ${showConfirmation}`}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowConfirmation(null)}>
                    Cancel
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-between">
            <Button onClick={onClose} variant="outline" className="px-6 bg-transparent">
              Close
            </Button>

            {caseData.status === "Pending Review" && (
              <div className="flex gap-3">
                <Button
                  onClick={() => handleStatusUpdate("Denied")}
                  disabled={updating}
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50 px-6"
                >
                  <X className="h-4 w-4 mr-2" />
                  Deny Case
                </Button>
                <Button
                  onClick={() => handleStatusUpdate("Accepted")}
                  disabled={updating}
                  className="bg-green-600 hover:bg-green-700 text-white px-6"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Accept Case
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
