import React, { useState, useEffect, createContext, useContext } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, addDoc, setDoc, updateDoc, onSnapshot, collection, query, where, serverTimestamp } from 'firebase/firestore';

// --- Firebase Context ---
const FirebaseContext = createContext(null);

const FirebaseProvider = ({ children }) => {
  const [app, setApp] = useState(null);
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    try {
      // Initialize Firebase
      const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
      const firebaseApp = initializeApp(firebaseConfig);
      const firestoreDb = getFirestore(firebaseApp);
      const firebaseAuth = getAuth(firebaseApp);

      setApp(firebaseApp);
      setDb(firestoreDb);
      setAuth(firebaseAuth);

      // Sign in with custom token or anonymously
      const signInUser = async () => {
        try {
          if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(firebaseAuth, __initial_auth_token);
          } else {
            await signInAnonymously(firebaseAuth);
          }
        } catch (error) {
          console.error("Firebase authentication error:", error);
          // Fallback to anonymous if custom token fails
          try {
            await signInAnonymously(firebaseAuth);
          } catch (anonError) {
            console.error("Anonymous sign-in failed:", anonError);
          }
        }
      };

      signInUser();

      // Listen for auth state changes
      const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
        if (user) {
          setUserId(user.uid);
        } else {
          setUserId(null); // User is signed out
        }
        setIsAuthReady(true); // Auth state is ready
      });

      return () => unsubscribe(); // Cleanup auth listener
    } catch (error) {
      console.error("Error initializing Firebase:", error);
    }
  }, []); // Run only once on component mount

  // Provide Firebase instances and user ID to children
  return (
    <FirebaseContext.Provider value={{ app, db, auth, userId, isAuthReady }}>
      {children}
    </FirebaseContext.Provider>
  );
};

// --- Custom Hook to use Firebase Context ---
const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};

// --- Components ---

// Custom Modal Component
const Modal = ({ children, title, onClose }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

// Officer Dashboard Component
const OfficerDashboard = () => {
  const { db, userId, isAuthReady } = useFirebase();
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

  // Discord Webhook URL
  const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1397000090526158849/uUeVm2lAXQUU0zo8BORc8geteu3R1wLzZ8eNQdnhaIJv86RIB04kI0gcSJxGGzpPcchY';

  const [arrestedUser, setArrestedUser] = useState('');
  const [reason, setReason] = useState('');
  const [evidenceUrls, setEvidenceUrls] = useState(''); // Comma-separated URLs
  const [courtDatesAvailability, setCourtDatesAvailability] = useState(''); // Comma-separated dates
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'

  const handleSubmitArrest = async (e) => {
    e.preventDefault();
    if (!db || !userId) {
      setMessage('Database not ready or user not authenticated. Please wait.');
      setMessageType('error');
      return;
    }

    if (!arrestedUser || !reason) {
      setMessage('Arrested User and Reason are required.');
      setMessageType('error');
      return;
    }

    try {
      const arrestData = {
        officerId: userId,
        arrestedUser,
        reason,
        evidenceUrls: evidenceUrls.split(',').map(url => url.trim()).filter(url => url !== ''),
        courtDatesAvailability: courtDatesAvailability.split(',').map(date => date.trim()).filter(date => date !== ''),
        status: 'Pending Review',
        submissionDate: serverTimestamp(),
        courtStaffNotes: '',
        reviewDate: null,
        reviewerId: null,
      };

      // Store in public collection for simplicity, accessible by all authenticated users
      const arrestsCollectionRef = collection(db, `artifacts/${appId}/public/data/arrests`);
      const docRef = await addDoc(arrestsCollectionRef, arrestData);

      setMessage('Arrest submitted successfully!');
      setMessageType('success');

      // Send notification to Discord webhook
      const discordMessage = {
        username: "Arrest Management System",
        avatar_url: "https://placehold.co/128x128/007bff/ffffff?text=AMS", // Placeholder icon
        embeds: [
          {
            title: "New Arrest Submitted!",
            description: `A new arrest has been submitted for review.`,
            color: 3447003, // Blue color
            fields: [
              {
                name: "Arrested User",
                value: arrestedUser,
                inline: true
              },
              {
                name: "Reason",
                value: reason,
                inline: true
              },
              {
                name: "Officer ID",
                value: userId,
                inline: false
              },
              {
                name: "Case ID",
                value: docRef.id,
                inline: false
              }
            ],
            timestamp: new Date().toISOString(),
            footer: {
              text: "Arrest Management System"
            }
          }
        ]
      };

      try {
        await fetch(DISCORD_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(discordMessage),
        });
        console.log("Discord notification sent successfully.");
      } catch (webhookError) {
        console.error("Failed to send Discord notification:", webhookError);
      }

      // Clear form
      setArrestedUser('');
      setReason('');
      setEvidenceUrls('');
      setCourtDatesAvailability('');
    } catch (error) {
      console.error("Error submitting arrest:", error);
      setMessage(`Error submitting arrest: ${error.message}`);
      setMessageType('error');
    }
  };

  if (!isAuthReady) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <p className="text-lg text-gray-700">Loading authentication...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex flex-col items-center">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-3xl">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Officer Dashboard</h1>
        <p className="text-sm text-gray-600 mb-4 text-center">
          Logged in as Officer ID: <span className="font-mono bg-gray-200 px-2 py-1 rounded text-sm">{userId}</span>
        </p>

        {message && (
          <div className={`p-3 mb-4 rounded-md ${messageType === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmitArrest} className="space-y-6">
          <div>
            <label htmlFor="arrestedUser" className="block text-sm font-medium text-gray-700 mb-1">Arrested User</label>
            <input
              type="text"
              id="arrestedUser"
              value={arrestedUser}
              onChange={(e) => setArrestedUser(e.target.value)}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="e.g., John Doe"
              required
            />
          </div>

          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">Reason for Arrest</label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows="3"
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="e.g., Grand Theft Auto, possession of illegal substances"
              required
            ></textarea>
          </div>

          <div>
            <label htmlFor="evidenceUrls" className="block text-sm font-medium text-gray-700 mb-1">Evidence (URLs/Descriptions - comma separated)</label>
            <textarea
              id="evidenceUrls"
              value={evidenceUrls}
              onChange={(e) => setEvidenceUrls(e.target.value)}
              rows="2"
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="e.g., https://example.com/screenshot1.png, video of incident, document scan"
            ></textarea>
            <p className="mt-1 text-xs text-gray-500">
              (Note: Actual file uploads are not supported in this demo. Please provide URLs or descriptive text.)
            </p>
          </div>

          <div>
            <label htmlFor="courtDatesAvailability" className="block text-sm font-medium text-gray-700 mb-1">Court Dates Availability (comma separated)</label>
            <input
              type="text"
              id="courtDatesAvailability"
              value={courtDatesAvailability}
              onChange={(e) => setCourtDatesAvailability(e.target.value)}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="e.g., 2025-08-10, 2025-08-15 (afternoons)"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Submit Arrest
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Court Staff Dashboard Component
const CourtStaffDashboard = () => {
  const { db, userId, isAuthReady } = useFirebase();
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

  const [arrests, setArrests] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [filterStatus, setFilterStatus] = useState('All'); // 'All', 'Pending Review', 'Accepted', 'Denied'
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'

  useEffect(() => {
    if (!db || !isAuthReady) return;

    // Listen for real-time updates to the arrests collection
    const arrestsCollectionRef = collection(db, `artifacts/${appId}/public/data/arrests`);
    const q = filterStatus === 'All' ? arrestsCollectionRef : query(arrestsCollectionRef, where('status', '==', filterStatus));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const updatedArrests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort by submission date, newest first
      updatedArrests.sort((a, b) => (b.submissionDate?.toDate() || 0) - (a.submissionDate?.toDate() || 0));
      setArrests(updatedArrests);
    }, (error) => {
      console.error("Error fetching arrests:", error);
      setMessage(`Error loading cases: ${error.message}`);
      setMessageType('error');
    });

    return () => unsubscribe(); // Cleanup listener on unmount
  }, [db, isAuthReady, appId, filterStatus]);

  const handleReviewCase = (caseData) => {
    setSelectedCase(caseData);
  };

  const handleCloseModal = () => {
    setSelectedCase(null);
  };

  const handleUpdateCaseStatus = async (caseId, newStatus, notes) => {
    if (!db || !userId) {
      setMessage('Database not ready or user not authenticated. Please wait.');
      setMessageType('error');
      return;
    }
    try {
      const caseDocRef = doc(db, `artifacts/${appId}/public/data/arrests`, caseId);
      await updateDoc(caseDocRef, {
        status: newStatus,
        courtStaffNotes: notes,
        reviewDate: serverTimestamp(),
        reviewerId: userId,
      });
      setMessage(`Case ${caseId} updated to ${newStatus}.`);
      setMessageType('success');
      setSelectedCase(null); // Close modal after update
    } catch (error) {
      console.error("Error updating case status:", error);
      setMessage(`Error updating case status: ${error.message}`);
      setMessageType('error');
    }
  };

  if (!isAuthReady) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <p className="text-lg text-gray-700">Loading authentication...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex flex-col items-center">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-5xl">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Court Staff Dashboard</h1>
        <p className="text-sm text-gray-600 mb-4 text-center">
          Logged in as Court Staff ID: <span className="font-mono bg-gray-200 px-2 py-1 rounded text-sm">{userId}</span>
        </p>

        {message && (
          <div className={`p-3 mb-4 rounded-md ${messageType === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message}
          </div>
        )}

        <div className="mb-6 flex justify-end items-center">
          <label htmlFor="statusFilter" className="text-sm font-medium text-gray-700 mr-2">Filter by Status:</label>
          <select
            id="statusFilter"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="All">All</option>
            <option value="Pending Review">Pending Review</option>
            <option value="Accepted">Accepted</option>
            <option value="Denied">Denied</option>
          </select>
        </div>

        {arrests.length === 0 ? (
          <p className="text-center text-gray-600 text-lg">No arrest cases to display.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Case ID</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Arrested User</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Officer ID</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submission Date</th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {arrests.map((arrest) => (
                  <tr key={arrest.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{arrest.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{arrest.arrestedUser}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{arrest.reason}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        arrest.status === 'Pending Review' ? 'bg-yellow-100 text-yellow-800' :
                        arrest.status === 'Accepted' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {arrest.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{arrest.officerId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {arrest.submissionDate ? new Date(arrest.submissionDate.toDate()).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleReviewCase(arrest)}
                        className="text-blue-600 hover:text-blue-900 px-3 py-1 rounded-md border border-blue-600 hover:border-blue-900"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedCase && (
        <CaseDetailModal
          caseData={selectedCase}
          onClose={handleCloseModal}
          onUpdateStatus={handleUpdateCaseStatus}
        />
      )}
    </div>
  );
};

// Case Detail Modal Component
const CaseDetailModal = ({ caseData, onClose, onUpdateStatus }) => {
  const [courtStaffNotes, setCourtStaffNotes] = useState(caseData.courtStaffNotes || '');
  const [summary, setSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState('');

  const handleAccept = () => {
    onUpdateStatus(caseData.id, 'Accepted', courtStaffNotes);
  };

  const handleDeny = () => {
    onUpdateStatus(caseData.id, 'Denied', courtStaffNotes);
  };

  const handleGenerateSummary = async () => {
    setLoadingSummary(true);
    setSummary('');
    setSummaryError('');

    const prompt = `Summarize the following arrest case details concisely, focusing on the key facts for a court staff member. Include the arrested user, reason, evidence, and court availability.
    Arrested User: ${caseData.arrestedUser}
    Reason for Arrest: ${caseData.reason}
    Evidence: ${caseData.evidenceUrls && caseData.evidenceUrls.length > 0 ? caseData.evidenceUrls.join(', ') : 'None provided.'}
    Court Dates Availability: ${caseData.courtDatesAvailability && caseData.courtDatesAvailability.length > 0 ? caseData.courtDatesAvailability.join(', ') : 'None provided.'}
    Officer ID: ${caseData.officerId}
    Submission Date: ${caseData.submissionDate ? new Date(caseData.submissionDate.toDate()).toLocaleString() : 'N/A'}
    `;

    let chatHistory = [];
    chatHistory.push({ role: "user", parts: [{ text: prompt }] });
    const payload = { contents: chatHistory };
    const apiKey = ""; // Canvas will provide this if empty
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        setSummary(result.candidates[0].content.parts[0].text);
      } else {
        setSummaryError("Could not generate summary. Unexpected AI response.");
        console.error("AI response structure unexpected:", result);
      }
    } catch (error) {
      setSummaryError("Failed to generate summary. Please try again.");
      console.error("Error calling Gemini API for summary:", error);
    } finally {
      setLoadingSummary(false);
    }
  };


  return (
    <Modal title={`Case Details: ${caseData.arrestedUser}`} onClose={onClose}>
      <div className="space-y-4 text-gray-700">
        <p><strong>Case ID:</strong> {caseData.id}</p>
        <p><strong>Officer ID:</strong> {caseData.officerId}</p>
        <p><strong>Arrested User:</strong> {caseData.arrestedUser}</p>
        <p><strong>Reason for Arrest:</strong> {caseData.reason}</p>
        <p><strong>Status:</strong> <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
            caseData.status === 'Pending Review' ? 'bg-yellow-100 text-yellow-800' :
            caseData.status === 'Accepted' ? 'bg-green-100 text-green-800' :
            'bg-red-100 text-red-800'
          }`}>{caseData.status}</span></p>
        <p><strong>Submission Date:</strong> {caseData.submissionDate ? new Date(caseData.submissionDate.toDate()).toLocaleString() : 'N/A'}</p>

        {caseData.reviewDate && (
          <p><strong>Review Date:</strong> {new Date(caseData.reviewDate.toDate()).toLocaleString()}</p>
        )}
        {caseData.reviewerId && (
          <p><strong>Reviewed By:</strong> {caseData.reviewerId}</p>
        )}

        <div>
          <h3 className="font-semibold mt-4 mb-2">Evidence:</h3>
          {caseData.evidenceUrls && caseData.evidenceUrls.length > 0 ? (
            <ul className="list-disc list-inside ml-4">
              {caseData.evidenceUrls.map((url, index) => (
                <li key={index}>{url}</li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 italic">No evidence details provided.</p>
          )}
        </div>

        <div>
          <h3 className="font-semibold mt-4 mb-2">Officer's Court Availability:</h3>
          {caseData.courtDatesAvailability && caseData.courtDatesAvailability.length > 0 ? (
            <ul className="list-disc list-inside ml-4">
              {caseData.courtDatesAvailability.map((date, index) => (
                <li key={index}>{date}</li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 italic">No availability dates provided.</p>
          )}
        </div>

        <div className="mt-4 flex justify-center">
          <button
            onClick={handleGenerateSummary}
            disabled={loadingSummary}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingSummary ? (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.000 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              'Summarize Case Details ✨'
            )}
          </button>
        </div>

        {summary && (
          <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
            <h3 className="font-semibold mb-2">AI Generated Summary:</h3>
            <p className="whitespace-pre-wrap text-gray-800">{summary}</p>
          </div>
        )}

        {summaryError && (
          <div className="mt-4 p-3 bg-red-100 rounded-md border border-red-200 text-red-700">
            Error: {summaryError}
          </div>
        )}

        <div className="mt-4">
          <label htmlFor="courtStaffNotes" className="block text-sm font-medium text-gray-700 mb-1">Court Staff Notes</label>
          <textarea
            id="courtStaffNotes"
            value={courtStaffNotes}
            onChange={(e) => setCourtStaffNotes(e.target.value)}
            rows="4"
            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Add your notes here..."
          ></textarea>
        </div>

        {caseData.status === 'Pending Review' && (
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={handleAccept}
              className="inline-flex items-center px-5 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Accept Case
            </button>
            <button
              onClick={handleDeny}
              className="inline-flex items-center px-5 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Deny Case
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};


// Main App Component
const App = () => {
  const [view, setView] = useState('officer'); // 'officer' or 'courtStaff'

  return (
    <FirebaseProvider>
      <div className="font-inter antialiased">
        <style>
          {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          body { font-family: 'Inter', sans-serif; }
          `}
        </style>
        <script src="https://cdn.tailwindcss.com"></script>

        <nav className="bg-gray-800 p-4 shadow-md">
          <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center">
            {/* Logo and Title */}
            <div className="flex items-center mb-4 sm:mb-0">
              <img
                src="http://googleusercontent.com/file_content/1" // URL for the uploaded logo
                alt="Dauphin County Justice Logo"
                className="h-10 w-10 mr-3 rounded-full"
              />
              <div className="text-white text-xl sm:text-2xl font-bold text-center sm:text-left">Dauphin County Courthouse Case Management</div>
            </div>
            <div className="flex space-x-2 sm:space-x-4">
              <button
                onClick={() => setView('officer')}
                className={`px-3 py-2 sm:px-4 sm:py-2 rounded-md font-medium text-sm sm:text-base transition-colors duration-200 ${
                  view === 'officer' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                Officer View
              </button>
              <button
                onClick={() => setView('courtStaff')}
                className={`px-3 py-2 sm:px-4 sm:py-2 rounded-md font-medium text-sm sm:text-base transition-colors duration-200 ${
                  view === 'courtStaff' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                Court Staff View
              </button>
            </div>
          </div>
        </nav>

        {view === 'officer' ? <OfficerDashboard /> : <CourtStaffDashboard />}
      </div>
    </FirebaseProvider>
  );
};

export default App;
