"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"

const CHARGES_LIST = [
  "Murder - 1.2-01 [CLASS 2 FELONY]",
  "Involuntary Manslaughter - 1.2-02 [CLASS 5 FELONY]",
  "Assault - 1.3-01 [CLASS 3 MISDEMEANOR]",
  "Battery - 1.3-02 [CLASS 2 MISDEMEANOR]",
  "Theft - 2.1-01 [CLASS 4 FELONY]",
  "Burglary - 2.2-01 [CLASS 3 FELONY]",
  "Drug Possession - 3.1-01 [CLASS 1 MISDEMEANOR]",
  "Drug Distribution - 3.1-02 [CLASS 2 FELONY]",
  "DUI - 4.1-01 [CLASS 1 MISDEMEANOR]",
  "Reckless Driving - 4.2-01 [CLASS 2 MISDEMEANOR]",
  "Fraud - 5.1-01 [CLASS 4 FELONY]",
  "Identity Theft - 5.2-01 [CLASS 3 FELONY]",
  "Domestic Violence - 6.1-01 [CLASS 2 MISDEMEANOR]",
  "Harassment - 6.2-01 [CLASS 3 MISDEMEANOR]",
  "Vandalism - 7.1-01 [CLASS 1 MISDEMEANOR]",
]

interface ArrestRecord {
  id: string
  arrestedUser: string
  reasonForArrest: string
  arrestContext: string
  evidence: string
  courtDatesAvailability: string
  officerId: string
  status: string
  submissionDate: string
  courtStaffNotes: string
}

export default function OfficerDashboard() {
  const [formData, setFormData] = useState({
    arrestedUser: "",
    reasonForArrest: "",
    arrestContext: "",
    evidence: "",
    courtDatesAvailability: "",
  })
  const [selectedCharges, setSelectedCharges] = useState<string[]>([])
  const [chargeSearch, setChargeSearch] = useState("")
  const [showChargeDropdown, setShowChargeDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const filteredCharges = CHARGES_LIST.filter(
    (charge) => charge.toLowerCase().includes(chargeSearch.toLowerCase()) && !selectedCharges.includes(charge),
  )

  const addCharge = (charge: string) => {
    setSelectedCharges([...selectedCharges, charge])
    setChargeSearch("")
    setShowChargeDropdown(false)
    updateReasonForArrest([...selectedCharges, charge])
  }

  const removeCharge = (chargeToRemove: string) => {
    const newCharges = selectedCharges.filter((charge) => charge !== chargeToRemove)
    setSelectedCharges(newCharges)
    updateReasonForArrest(newCharges)
  }

  const updateReasonForArrest = (charges: string[]) => {
    setFormData((prev) => ({
      ...prev,
      reasonForArrest: charges.join(", "),
    }))
  }

  const sendDiscordNotification = async (caseData: ArrestRecord) => {
    try {
      const webhookUrl =
        "https://discord.com/api/webhooks/1397000090526158849/uUeVm2lAXQUU0zo8BORc8geteu3R1wLzZ8eNQdnhaIJv86RIB04kI0gcSJxGGzpPcchY"

      const embed = {
        title: "🚨 New Arrest Submitted",
        color: 0x3b82f6,
        fields: [
          { name: "Case ID", value: caseData.id, inline: true },
          { name: "Officer ID", value: caseData.officerId, inline: true },
          { name: "Arrested User", value: caseData.arrestedUser, inline: true },
          { name: "Charges", value: caseData.reasonForArrest || "N/A", inline: false },
          {
            name: "Arrest Context",
            value: caseData.arrestContext
              ? caseData.arrestContext.substring(0, 1000) + (caseData.arrestContext.length > 1000 ? "..." : "")
              : "N/A",
            inline: false,
          },
          { name: "Evidence", value: caseData.evidence || "N/A", inline: false },
          { name: "Court Dates", value: caseData.courtDatesAvailability || "N/A", inline: false },
        ],
        timestamp: new Date().toISOString(),
      }

      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embeds: [embed] }),
      })
    } catch (error) {
      console.error("Discord notification failed:", error)
    }
  }

  const saveToLocalStorage = (record: ArrestRecord) => {
    const existingRecords = JSON.parse(localStorage.getItem("arrestRecords") || "[]")
    const updatedRecords = [...existingRecords, record]
    localStorage.setItem("arrestRecords", JSON.stringify(updatedRecords))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const caseData: ArrestRecord = {
        id: "case-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9),
        ...formData,
        officerId: "officer-" + Math.random().toString(36).substr(2, 9),
        status: "Pending Review",
        submissionDate: new Date().toISOString(),
        courtStaffNotes: "",
      }

      // Save to localStorage
      saveToLocalStorage(caseData)

      // Send Discord notification
      await sendDiscordNotification(caseData)

      setMessage({ type: "success", text: "Arrest record submitted successfully!" })

      // Reset form
      setFormData({
        arrestedUser: "",
        reasonForArrest: "",
        arrestContext: "",
        evidence: "",
        courtDatesAvailability: "",
      })
      setSelectedCharges([])
    } catch (error) {
      console.error("Submission failed:", error)
      setMessage({ type: "error", text: "Failed to submit arrest record. Please try again." })
    } finally {
      setLoading(false)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowChargeDropdown(false)
    if (showChargeDropdown) {
      document.addEventListener("click", handleClickOutside)
      return () => document.removeEventListener("click", handleClickOutside)
    }
  }, [showChargeDropdown])

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="shadow-xl border-0">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
          <CardTitle className="text-2xl font-bold">Officer Dashboard - Submit Arrest</CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          {message && (
            <div
              className={`mb-6 p-4 rounded-lg ${
                message.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="arrestedUser" className="text-sm font-medium text-gray-700">
                Arrested User *
              </Label>
              <Input
                id="arrestedUser"
                type="text"
                required
                value={formData.arrestedUser}
                onChange={(e) => setFormData((prev) => ({ ...prev, arrestedUser: e.target.value }))}
                className="mt-1 transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                placeholder="Enter the name of the arrested individual"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700">Reason for Arrest *</Label>
              <div className="mt-1 space-y-3">
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <Input
                    type="text"
                    placeholder="Search for charges..."
                    value={chargeSearch}
                    onChange={(e) => {
                      setChargeSearch(e.target.value)
                      setShowChargeDropdown(true)
                    }}
                    onFocus={() => setShowChargeDropdown(true)}
                    className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                  />

                  {showChargeDropdown && filteredCharges.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                      {filteredCharges.map((charge, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => addCharge(charge)}
                          className="w-full px-4 py-2 text-left hover:bg-blue-50 transition-colors duration-150"
                        >
                          {charge}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selectedCharges.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedCharges.map((charge, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {charge}
                        <button
                          type="button"
                          onClick={() => removeCharge(charge)}
                          className="ml-1 hover:bg-red-100 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                <Textarea
                  required
                  value={formData.reasonForArrest}
                  onChange={(e) => setFormData((prev) => ({ ...prev, reasonForArrest: e.target.value }))}
                  className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                  placeholder="Selected charges will appear here, or you can type manually..."
                  rows={4}
                />
              </div>
            </div>

            {/* Arrest Context Section - Add this after the charges section */}
            <div>
              <Label htmlFor="arrestContext" className="text-sm font-medium text-gray-700">
                Arrest Context & Circumstances *
              </Label>
              <p className="text-xs text-gray-500 mt-1 mb-2">
                Provide detailed information about the circumstances that led to this arrest, including location, time,
                witness information, and sequence of events.
              </p>
              <Textarea
                id="arrestContext"
                required
                value={formData.arrestContext}
                onChange={(e) => setFormData((prev) => ({ ...prev, arrestContext: e.target.value }))}
                className="mt-1 transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                placeholder="Describe the circumstances of the arrest:
• Location and time of incident
• What led to the arrest (witness reports, observed behavior, etc.)
• Sequence of events
• Any relevant background information
• Officer observations and actions taken

Example: 'On [date] at approximately [time], I responded to a call at [location] regarding [incident type]. Upon arrival, I observed [description of scene/behavior]. The suspect was [actions/behavior observed]. After [investigation steps], I determined probable cause existed for arrest based on [specific reasons]...'"
                rows={8}
              />
            </div>

            <div>
              <Label htmlFor="evidence" className="text-sm font-medium text-gray-700">
                Evidence (URLs/Descriptions)
              </Label>
              <Textarea
                id="evidence"
                value={formData.evidence}
                onChange={(e) => setFormData((prev) => ({ ...prev, evidence: e.target.value }))}
                className="mt-1 transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                placeholder="Enter comma-separated URLs or descriptions of evidence"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="courtDates" className="text-sm font-medium text-gray-700">
                Court Dates Availability
              </Label>
              <Input
                id="courtDates"
                type="date"
                value={formData.courtDatesAvailability}
                onChange={(e) => setFormData((prev) => ({ ...prev, courtDatesAvailability: e.target.value }))}
                className="mt-1 transition-all duration-200 focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Select an initial date. You can add multiple dates manually, separated by commas.
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 rounded-lg transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
            >
              {loading ? "Submitting..." : "Submit Arrest Record"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
