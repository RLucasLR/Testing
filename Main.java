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
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100 opacity-100">
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-2xl font-semibold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-3xl font-bold transition-colors duration-200"
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
  const [contextOfIncident, setContextOfIncident] = useState(''); // New state for context
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'

  // State for charge search and suggestions
  const [chargeSearchTerm, setChargeSearchTerm] = useState('');
  const [suggestedCharges, setSuggestedCharges] = useState([]);

  // Simulated database of charges (from Google Sheet data)
  const chargesDatabase = [
    "Murder - 1.2-01 [CLASS 2 FELONY]",
    "Involuntary Manslaughter - 1.2-02 (CLASS 5 FELON)",
    "Voluntary Manslaughter - 1.2-03 (CLASS 4 FELONY)",
    "Accessory to murder/homicide - 1.2-04 (CLASS 4 FELONY)",
    "Racketeer Influenced and Corrupt Organizations - 1.2-05 (CLASS 1 FELONY)",
    "Reckless Endangerment by Mob - 1.2-06 (CLASS 3 FELONY)",
    "Assault or Battery by Mob - 1.2-07 (CLASS 1 FELONY)",
    "Criminal Street Gang Participation - 1.2-08 (CLASS 5 FELONY)",
    "Recruitment of Persons for Criminal Street Gangs - 1.2-09 (CLASS 3 MISDEMEANDOR)"
  ];

  // Effect to filter charges based on search term
  useEffect(() => {
    if (chargeSearchTerm.trim() === '') {
      setSuggestedCharges([]);
      return;
    }
    const filtered = chargesDatabase.filter(charge =>
      charge.toLowerCase().includes(chargeSearchTerm.toLowerCase())
    ).slice(0, 10); // Limit to 10 suggestions
    setSuggestedCharges(filtered);
  }, [chargeSearchTerm]);

  const handleChargeSelect = (selectedCharge) => {
    // Append the selected charge to the existing reason, separated by a comma
    setReason(prevReason =>
      prevReason ? `${prevReason}, ${selectedCharge}` : selectedCharge
    );
    setChargeSearchTerm(''); // Clear search term after selection
    setSuggestedCharges([]); // Clear suggestions
  };

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
        reason, // Reason now contains comma-separated charges
        evidenceUrls: evidenceUrls.split(',').map(url => url.trim()).filter(url => url !== ''),
        courtDatesAvailability: courtDatesAvailability.split(',').map(date => date.trim()).filter(date => date !== ''),
        contextOfIncident: contextOfIncident, // Include the new context field
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
      setContextOfIncident(''); // Clear the new context field
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
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-3xl border border-gray-200">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-6 text-center">Officer Dashboard</h1>
        <p className="text-md text-gray-600 mb-6 text-center">
          Logged in as Officer ID: <span className="font-mono bg-blue-50 text-blue-800 px-2 py-1 rounded-md text-sm font-semibold">{userId}</span>
        </p>

        {message && (
          <div className={`p-4 mb-6 rounded-lg ${messageType === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'} shadow-sm`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmitArrest} className="space-y-6">
          <div>
            <label htmlFor="arrestedUser" className="block text-sm font-medium text-gray-700 mb-2">Arrested User <span className="text-red-500">*</span></label>
            <input
              type="text"
              id="arrestedUser"
              value={arrestedUser}
              onChange={(e) => setArrestedUser(e.target.value)}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-base transition-all duration-200"
              placeholder="e.g., John Doe"
              required
            />
          </div>

          {/* Reason for Arrest with Search and Suggestions */}
          <div className="relative"> {/* Added relative for absolute positioning of suggestions */}
            <label htmlFor="chargeSearch" className="block text-sm font-medium text-gray-700 mb-2">Search & Add Charges <span className="text-red-500">*</span></label>
            <input
              type="text"
              id="chargeSearch"
              value={chargeSearchTerm}
              onChange={(e) => setChargeSearchTerm(e.target.value)}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-base transition-all duration-200"
              placeholder="Search for a charge (e.g., Theft, Assault)"
            />
            {suggestedCharges.length > 0 && (
              <ul className="absolute z-10 bg-white border border-gray-300 rounded-lg shadow-lg w-full mt-1 max-h-60 overflow-y-auto">
                {suggestedCharges.map((charge, index) => (
                  <li
                    key={index}
                    onClick={() => handleChargeSelect(charge)}
                    className="px-4 py-2 cursor-pointer hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150 text-gray-800"
                  >
                    {charge}
                  </li>
                ))}
              </ul>
            )}
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mt-4 mb-2">Reason for Arrest (Selected Charges/Manual Entry)</label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows="4"
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-base transition-all duration-200"
              placeholder="Selected charges will appear here. You can also type manually."
              required
            ></textarea>
          </div>

          {/* New section for Context of Incident */}
          <div>
            <label htmlFor="contextOfIncident" className="block text-sm font-medium text-gray-700 mb-2">Context of Incident</label>
            <textarea
              id="contextOfIncident"
              value={contextOfIncident}
              onChange={(e) => setContextOfIncident(e.target.value)}
              rows="6"
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-base transition-all duration-200"
              placeholder="Provide a detailed narrative of the incident, including time, location, involved parties, and sequence of events."
            ></textarea>
            <p className="mt-2 text-xs text-gray-500">
              (Optional) Describe the circumstances surrounding the arrest.
            </p>
          </div>

          <div>
            <label htmlFor="courtDatesAvailability" className="block text-sm font-medium text-gray-700 mb-2">Court Dates Availability (Select Date(s))</label>
            <input
              type="date" // Changed to type="date"
              id="courtDatesAvailability"
              value={courtDatesAvailability}
              onChange={(e) => setCourtDatesAvailability(e.target.value)}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-base transition-all duration-200"
              // Removed placeholder as type="date" has its own default
            />
            <p className="mt-2 text-xs text-gray-500">
              Select one or more dates. For multiple dates, select one, then manually add others separated by commas in the field.
            </p>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-lg shadow-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 transform hover:scale-105"
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

  const [allArrests, setAllArrests] = useState([]); // Stores all arrests fetched from Firestore
  const [displayedArrests, setDisplayedArrests] = useState([]); // Stores arrests currently displayed (filtered/searched)
  const [filterStatus, setFilterStatus] = useState('All'); // 'All', 'Pending Review', 'Accepted', 'Denied'
  const [searchId, setSearchId] = useState(''); // State for the search input (Case ID)
  const [searchName, setSearchName] = useState(''); // State for the search input (Arrested User Name)
  const [selectedCase, setSelectedCase] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'

  useEffect(() => {
    if (!db || !isAuthReady) return;

    // Listen for real-time updates to the arrests collection
    const arrestsCollectionRef = collection(db, `artifacts/${appId}/public/data/arrests`);
    const unsubscribe = onSnapshot(arrestsCollectionRef, (snapshot) => {
      const fetchedArrests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort by submission date, newest first
      fetchedArrests.sort((a, b) => (b.submissionDate?.toDate() || 0) - (a.submissionDate?.toDate() || 0));
      setAllArrests(fetchedArrests);
    }, (error) => {
      console.error("Error fetching arrests:", error);
      setMessage(`Error loading cases: ${error.message}`);
      setMessageType('error');
    });

    return () => unsubscribe(); // Cleanup listener on unmount
  }, [db, isAuthReady, appId]);

  // Effect to apply filter and search whenever allArrests, filterStatus, searchId, or searchName changes
  useEffect(() => {
    let filtered = allArrests;

    const trimmedSearchId = searchId.trim().toLowerCase();
    const trimmedSearchName = searchName.trim().toLowerCase();

    if (trimmedSearchId !== '') {
      // Prioritize search by Case ID if provided
      filtered = filtered.filter(arrest => arrest.id.toLowerCase().includes(trimmedSearchId));
    } else if (trimmedSearchName !== '') {
      // Search by Arrested User Name if Case ID is empty and name is provided
      filtered = filtered.filter(arrest => arrest.arrestedUser.toLowerCase().includes(trimmedSearchName));
    }

    // Apply status filter after ID/Name search
    if (filterStatus !== 'All') {
      filtered = filtered.filter(arrest => arrest.status === filterStatus);
    }

    setDisplayedArrests(filtered);
  }, [allArrests, filterStatus, searchId, searchName]);


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
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-5xl border border-gray-200">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-6 text-center">Court Staff Dashboard</h1>
        <p className="text-md text-gray-600 mb-6 text-center">
          Logged in as Court Staff ID: <span className="font-mono bg-blue-50 text-blue-800 px-2 py-1 rounded-md text-sm font-semibold">{userId}</span>
        </p>

        {message && (
          <div className={`p-4 mb-6 rounded-lg ${messageType === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'} shadow-sm`}>
            {message}
          </div>
        )}

        {/* Search and Filter Controls */}
        <div className="mb-8 flex flex-col lg:flex-row justify-between items-center space-y-4 lg:space-y-0 lg:space-x-6 p-4 bg-gray-50 rounded-lg shadow-inner">
          {/* Search by Case ID */}
          <div className="flex items-center w-full lg:w-1/3">
            <label htmlFor="searchId" className="text-sm font-medium text-gray-700 mr-3 whitespace-nowrap">Case ID:</label>
            <input
              type="text"
              id="searchId"
              value={searchId}
              onChange={(e) => { setSearchId(e.target.value); setSearchName(''); }} // Clear name search when ID is typed
              placeholder="Enter Case ID"
              className="flex-grow px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-base transition-all duration-200"
            />
            <button
              onClick={() => setSearchId('')} // Clear search
              className="ml-3 px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
            >
              Clear
            </button>
          </div>

          {/* Search by Arrested User Name */}
          <div className="flex items-center w-full lg:w-1/3">
            <label htmlFor="searchName" className="text-sm font-medium text-gray-700 mr-3 whitespace-nowrap">Name:</label>
            <input
              type="text"
              id="searchName"
              value={searchName}
              onChange={(e) => { setSearchName(e.target.value); setSearchId(''); }} // Clear ID search when name is typed
              placeholder="Enter Arrested User Name"
              className="flex-grow px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-base transition-all duration-200"
            />
            <button
              onClick={() => setSearchName('')} // Clear search
              className="ml-3 px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
            >
              Clear
            </button>
          </div>

          {/* Filter by Status */}
          <div className="flex items-center w-full lg:w-1/4 justify-end">
            <label htmlFor="statusFilter" className="text-sm font-medium text-gray-700 mr-3 whitespace-nowrap">Status:</label>
            <select
              id="statusFilter"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex-grow px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-base transition-all duration-200"
            >
              <option value="All">All</option>
              <option value="Pending Review">Pending Review</option>
              <option value="Accepted">Accepted</option>
              <option value="Denied">Denied</option>
            </select>
          </div>
        </div>

        {displayedArrests.length === 0 ? (
          <p className="text-center text-gray-600 text-lg py-8">No arrest cases to display based on current filters/search.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl shadow-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-blue-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider">Case ID</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider">Arrested User</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider">Reason</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider">Officer ID</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider">Submission Date</th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {displayedArrests.map((arrest, index) => (
                  <tr key={arrest.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{arrest.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{arrest.arrestedUser}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{arrest.reason}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
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
                        className="text-blue-600 hover:text-blue-800 px-4 py-2 rounded-lg border border-blue-600 hover:border-blue-800 transition-colors duration-200 shadow-sm hover:shadow-md"
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
    Context of Incident: ${caseData.contextOfIncident || 'None provided.'}
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
        <p className="text-base"><strong>Case ID:</strong> <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-sm">{caseData.id}</span></p>
        <p className="text-base"><strong>Officer ID:</strong> <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-sm">{caseData.officerId}</span></p>
        <p className="text-base"><strong>Arrested User:</strong> <span className="font-semibold">{caseData.arrestedUser}</span></p>
        <p className="text-base"><strong>Reason for Arrest:</strong> <span className="italic">{caseData.reason}</span></p>
        <p className="text-base"><strong>Status:</strong> <span className={`px-2 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${
            caseData.status === 'Pending Review' ? 'bg-yellow-100 text-yellow-800' :
            caseData.status === 'Accepted' ? 'bg-green-100 text-green-800' :
            'bg-red-100 text-red-800'
          }`}>{caseData.status}</span></p>
        <p className="text-base"><strong>Submission Date:</strong> {caseData.submissionDate ? new Date(caseData.submissionDate.toDate()).toLocaleString() : 'N/A'}</p>

        {caseData.reviewDate && (
          <p className="text-base"><strong>Review Date:</strong> {new Date(caseData.reviewDate.toDate()).toLocaleString()}</p>
        )}
        {caseData.reviewerId && (
          <p className="text-base"><strong>Reviewed By:</strong> {caseData.reviewerId}</p>
        )}

        <div className="pt-4 border-t border-gray-200 mt-4">
          <h3 className="font-semibold text-lg mb-2 text-gray-800">Evidence:</h3>
          {caseData.evidenceUrls && caseData.evidenceUrls.length > 0 ? (
            <ul className="list-disc list-inside ml-4 text-base space-y-1">
              {caseData.evidenceUrls.map((url, index) => (
                <li key={index}>{url}</li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 italic">No evidence details provided.</p>
          )}
        </div>

        <div className="pt-4 border-t border-gray-200 mt-4">
          <h3 className="font-semibold text-lg mb-2 text-gray-800">Officer's Court Availability:</h3>
          {caseData.courtDatesAvailability && caseData.courtDatesAvailability.length > 0 ? (
            <ul className="list-disc list-inside ml-4 text-base space-y-1">
              {caseData.courtDatesAvailability.map((date, index) => (
                <li key={index}>{date}</li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 italic">No availability dates provided.</p>
          )}
        </div>

        {/* Display Context of Incident in Court Staff View */}
        <div className="pt-4 border-t border-gray-200 mt-4">
          <h3 className="font-semibold text-lg mb-2 text-gray-800">Context of Incident:</h3>
          {caseData.contextOfIncident ? (
            <p className="whitespace-pre-wrap text-base">{caseData.contextOfIncident}</p>
          ) : (
            <p className="text-gray-500 italic">No additional context provided.</p>
          )}
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={handleGenerateSummary}
            disabled={loadingSummary}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
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
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200 shadow-sm">
            <h3 className="font-semibold text-lg mb-2 text-gray-800">AI Generated Summary:</h3>
            <p className="whitespace-pre-wrap text-gray-800 text-base">{summary}</p>
          </div>
        )}

        {summaryError && (
          <div className="mt-6 p-4 bg-red-100 rounded-lg border border-red-200 text-red-700 shadow-sm">
            Error: {summaryError}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-gray-200">
          <label htmlFor="courtStaffNotes" className="block text-sm font-medium text-gray-700 mb-2">Court Staff Notes</label>
          <textarea
            id="courtStaffNotes"
            value={courtStaffNotes}
            onChange={(e) => setCourtStaffNotes(e.target.value)}
            rows="5"
            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-base transition-all duration-200"
            placeholder="Add your notes here..."
          ></textarea>
        </div>

        {caseData.status === 'Pending Review' && (
          <div className="flex justify-end space-x-4 mt-6">
            <button
              onClick={handleAccept}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 transform hover:scale-105"
            >
              Accept Case
            </button>
            <button
              onClick={handleDeny}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 transform hover:scale-105"
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
      <div className="font-inter antialiased bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
        <style>
          {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
          body { font-family: 'Inter', sans-serif; }
          `}
        </style>
        <script src="https://cdn.tailwindcss.com"></script>

        <nav className="bg-gray-800 p-4 shadow-xl">
          <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center py-2">
            {/* Logo and Title */}
            <div className="flex items-center mb-4 sm:mb-0">
              <img
                src="http://googleusercontent.com/file_content/1" // URL for the uploaded logo
                alt="Dauphin County Justice Logo"
                className="h-12 w-12 mr-4 rounded-full shadow-lg border-2 border-white"
              />
              <div className="text-white text-xl sm:text-3xl font-extrabold text-center sm:text-left tracking-wide">Dauphin County Courthouse Case Management</div>
            </div>
            <div className="flex space-x-3 sm:space-x-6">
              <button
                onClick={() => setView('officer')}
                className={`px-5 py-2 sm:px-6 sm:py-2.5 rounded-lg font-semibold text-sm sm:text-base transition-all duration-300 transform hover:scale-105 shadow-md
                  ${view === 'officer' ? 'bg-blue-600 text-white ring-2 ring-blue-400' : 'text-gray-300 hover:bg-gray-700 hover:text-white bg-gray-700'}`
                }
              >
                Officer View
              </button>
              <button
                onClick={() => setView('courtStaff')}
                className={`px-5 py-2 sm:px-6 sm:py-2.5 rounded-lg font-semibold text-sm sm:text-base transition-all duration-300 transform hover:scale-105 shadow-md
                  ${view === 'courtStaff' ? 'bg-blue-600 text-white ring-2 ring-blue-400' : 'text-gray-300 hover:bg-gray-700 hover:text-white bg-gray-700'}`
                }
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
